import { type ClickHouseClient, type DataFormat, type ClickHouseSettings, createClient } from '@clickhouse/client';
import { DynamicModule, Global, Inject, Injectable, Logger, Module, OnModuleDestroy, Provider } from '@nestjs/common';

export const CLICKHOUSE_OPTIONS_TOKEN = 'CLICKHOUSE_OPTIONS';

export type { ClickHouseSettings };

export interface ClickHouseModuleOptions {
    url: string;
    username?: string;
    password?: string;
    database?: string;
    requestTimeoutMs?: number;
    maxOpenConnections?: number;
    application?: string;
    compression?: {
        request?: boolean;
        response?: boolean;
    };
}

export interface ClickHouseAsyncOptions {
    imports?: DynamicModule['imports'];
    useFactory: (...args: unknown[]) => ClickHouseModuleOptions | Promise<ClickHouseModuleOptions>;
    inject?: (string | symbol | Function)[];
}

export interface ClickHouseJsonResponse<T> {
    meta?: Array<{ name: string; type: string }>;
    data: T[];
    rows?: number;
    rows_before_limit_at_least?: number;
    statistics?: {
        elapsed?: number;
        rows_read?: number;
        bytes_read?: number;
    };
}

export interface ClickHouseRequestOptions {
    queryId?: string;
    clickHouseSettings?: ClickHouseSettings;
    database?: string | null;
    queryParams?: Record<string, unknown>;
    timeoutMs?: number;
}

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
    private readonly logger = new Logger(ClickHouseService.name);
    private readonly client: ClickHouseClient;
    private rootClient?: ClickHouseClient;
    private readonly clientsByDatabase = new Map<string, ClickHouseClient>();

    constructor(@Inject(CLICKHOUSE_OPTIONS_TOKEN) private readonly options: ClickHouseModuleOptions) {
        this.client = this.createClient(options.database);
        if (options.database) {
            this.clientsByDatabase.set(options.database, this.client);
        }
    }

    async execute(sql: string, options: ClickHouseRequestOptions = {}): Promise<string> {
        if (this.expectsResult(sql)) {
            return this.queryText(sql, options);
        }
        await this.command(sql, options);
        return '';
    }

    async command(sql: string, options: ClickHouseRequestOptions = {}): Promise<void> {
        await this.getClient(options).command({
            query: sql,
            ...this.toQueryOptions(options),
        });
    }

    async queryJson<T>(sql: string, options: ClickHouseRequestOptions = {}): Promise<ClickHouseJsonResponse<T>> {
        const { query, format } = this.stripTrailingFormat(sql, 'JSON');
        const resultSet = await this.getClient(options).query({
            query,
            format,
            ...this.toQueryOptions(options),
        });
        return (await resultSet.json<T>()) as ClickHouseJsonResponse<T>;
    }

    async queryText(sql: string, options: ClickHouseRequestOptions = {}): Promise<string> {
        const { query, format } = this.stripTrailingFormat(sql, 'TabSeparated');
        const resultSet = await this.getClient(options).query({
            query,
            format,
            ...this.toQueryOptions(options),
        });
        return resultSet.text();
    }

    async insertJsonEachRow<T extends Record<string, unknown>>(
        table: string,
        rows: readonly T[],
        options: ClickHouseRequestOptions = {},
    ): Promise<void> {
        if (rows.length === 0) {
            return;
        }
        await this.getClient(options).insert({
            table,
            values: rows,
            format: 'JSONEachRow',
            ...this.toQueryOptions(options),
        });
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping({ select: true, abort_signal: AbortSignal.timeout(2000) });
            return result.success;
        } catch (error) {
            this.logger.warn(`ClickHouse ping failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    async onModuleDestroy(): Promise<void> {
        const clients = new Set<ClickHouseClient>([
            this.client,
            ...(this.rootClient ? [this.rootClient] : []),
            ...this.clientsByDatabase.values(),
        ]);
        await Promise.all([...clients].map(client => client.close()));
    }

    private createClient(database?: string | null): ClickHouseClient {
        return createClient({
            url: this.normalizeBaseUrl(this.options.url || 'http://localhost:8123'),
            username: this.options.username,
            password: this.options.password,
            database: database ?? undefined,
            request_timeout: this.options.requestTimeoutMs ?? 10000,
            max_open_connections: this.options.maxOpenConnections,
            application: this.options.application ?? '@a3s-lab/api',
            compression: this.options.compression,
        });
    }

    private getClient(options: ClickHouseRequestOptions): ClickHouseClient {
        if (options.database === null) {
            return this.getRootClient();
        }
        const database = options.database?.trim();
        if (!database || database === this.options.database) {
            return this.client;
        }
        const cached = this.clientsByDatabase.get(database);
        if (cached) {
            return cached;
        }
        const client = this.createClient(database);
        this.clientsByDatabase.set(database, client);
        return client;
    }

    private getRootClient(): ClickHouseClient {
        if (!this.rootClient) {
            this.rootClient = this.createClient(null);
        }
        return this.rootClient;
    }

    private toQueryOptions(options: ClickHouseRequestOptions) {
        return {
            query_id: options.queryId,
            clickhouse_settings: options.clickHouseSettings,
            query_params: options.queryParams,
            abort_signal: AbortSignal.timeout(options.timeoutMs ?? this.options.requestTimeoutMs ?? 10000),
        };
    }

    private stripTrailingFormat(sql: string, fallback: DataFormat): { query: string; format: DataFormat } {
        const trimmed = sql.trim().replace(/;+$/, '');
        const match = trimmed.match(/\s+FORMAT\s+([A-Za-z0-9_]+)\s*$/i);
        if (!match) {
            return { query: trimmed, format: fallback };
        }
        return {
            query: trimmed.slice(0, match.index).trim(),
            format: match[1] as DataFormat,
        };
    }

    private expectsResult(sql: string): boolean {
        return /^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(sql);
    }

    private normalizeBaseUrl(url: string): string {
        const trimmed = url.trim().replace(/\/+$/, '');
        return trimmed || 'http://localhost:8123';
    }
}

@Global()
@Module({})
export class ClickHouseModule {
    static register(options: ClickHouseModuleOptions): DynamicModule {
        const providers: Provider[] = [{ provide: CLICKHOUSE_OPTIONS_TOKEN, useValue: options }, ClickHouseService];
        return {
            module: ClickHouseModule,
            providers,
            exports: [ClickHouseService],
        };
    }

    static registerAsync(options: ClickHouseAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: CLICKHOUSE_OPTIONS_TOKEN,
                useFactory: options.useFactory,
                inject: options.inject || [],
            },
            ClickHouseService,
        ];
        return {
            module: ClickHouseModule,
            imports: options.imports,
            providers,
            exports: [ClickHouseService],
        };
    }
}
