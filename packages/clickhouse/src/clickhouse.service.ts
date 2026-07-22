import {
    type ClickHouseClient,
    type ClickHouseClientConfigOptions,
    type CommandResult,
    createClient,
    type InsertResult,
} from '@clickhouse/client';
import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
    CLICKHOUSE_OPTIONS_TOKEN,
    ClickHouseClientPoolExhaustedError,
    type ClickHouseHealthResult,
    type ClickHouseJsonResponse,
    type ClickHouseModuleOptions,
    ClickHouseRequestError,
    type ClickHouseRequestOptions,
    ClickHouseServiceClosedError,
    type ClickHouseServiceStats,
    ClickHouseShutdownError,
} from './clickhouse.types';
import { type NormalizedClickHouseModuleOptions, normalizeClickHouseModuleOptions } from './clickhouse-options';
import {
    assertClickHouseRequestOptions,
    createClickHouseQueryOptions,
    expectsClickHouseResult,
    normalizeClickHouseSql,
    normalizeClickHouseTable,
    resolveClickHouseDatabase,
    splitTrailingClickHouseFormat,
} from './clickhouse-request';

interface ClientEntry {
    client: ClickHouseClient;
    database: string;
    active: number;
    lastUsed: number;
    closing: boolean;
    reserved: boolean;
    closeTask?: Promise<void>;
}

interface ClientLease {
    client: ClickHouseClient;
    release: () => void;
}

interface TaskSettlement {
    timedOut: boolean;
    errors: unknown[];
}

@Injectable()
export class ClickHouseService implements OnModuleDestroy {
    private readonly logger = new Logger(ClickHouseService.name);
    private readonly options: NormalizedClickHouseModuleOptions;
    private readonly defaultEntry: ClientEntry;
    private readonly clientsByDatabase = new Map<string, ClientEntry>();
    private readonly pendingClients = new Map<string, Promise<ClientEntry>>();
    private readonly activeOperations = new Set<Promise<unknown>>();
    private poolTail: Promise<void> = Promise.resolve();
    private closePromise: Promise<void> | null = null;
    private shuttingDown = false;
    private sequence = 0;

    constructor(@Inject(CLICKHOUSE_OPTIONS_TOKEN) options: ClickHouseModuleOptions) {
        this.options = normalizeClickHouseModuleOptions(options);
        this.defaultEntry = this.createEntry(this.options.database);
    }

    async execute(sql: string, options: ClickHouseRequestOptions = {}): Promise<string> {
        const query = normalizeClickHouseSql(sql);
        if (expectsClickHouseResult(query)) {
            return this.queryText(query, options);
        }
        await this.command(query, options);
        return '';
    }

    async command(sql: string, options: ClickHouseRequestOptions = {}): Promise<CommandResult> {
        const query = normalizeClickHouseSql(sql);
        const queryOptions = createClickHouseQueryOptions(options, this.options.requestTimeoutMs);
        return this.withClient(
            client =>
                client.command({
                    query,
                    ...queryOptions,
                }),
            options,
        );
    }

    async queryJson<T>(sql: string, options: ClickHouseRequestOptions = {}): Promise<ClickHouseJsonResponse<T>> {
        const { query, format } = splitTrailingClickHouseFormat(sql, 'JSON');
        if (format !== 'JSON') {
            throw new ClickHouseRequestError('queryJson only supports the JSON response format');
        }
        const queryOptions = createClickHouseQueryOptions(options, this.options.requestTimeoutMs);
        return this.withClient(async client => {
            const resultSet = await client.query({
                query,
                format: 'JSON',
                ...queryOptions,
            });
            return (await resultSet.json<T>()) as ClickHouseJsonResponse<T>;
        }, options);
    }

    async queryText(sql: string, options: ClickHouseRequestOptions = {}): Promise<string> {
        const { query, format } = splitTrailingClickHouseFormat(sql, 'TabSeparated');
        const queryOptions = createClickHouseQueryOptions(options, this.options.requestTimeoutMs);
        return this.withClient(async client => {
            const resultSet = await client.query({
                query,
                format,
                ...queryOptions,
            });
            return resultSet.text();
        }, options);
    }

    async insertJsonEachRow<T extends Record<string, unknown>>(
        table: string,
        rows: readonly T[],
        options: ClickHouseRequestOptions = {},
    ): Promise<void> {
        const normalizedTable = normalizeClickHouseTable(table);
        if (!Array.isArray(rows)) {
            throw new ClickHouseRequestError('rows must be an array');
        }
        if (rows.length === 0) {
            return;
        }
        const queryOptions = createClickHouseQueryOptions(options, this.options.requestTimeoutMs);
        await this.withClient(
            client =>
                client.insert({
                    table: normalizedTable,
                    values: rows,
                    format: 'JSONEachRow',
                    ...queryOptions,
                }),
            options,
        );
    }

    async insert<T extends Record<string, unknown>>(
        table: string,
        rows: readonly T[],
        options: ClickHouseRequestOptions = {},
    ): Promise<InsertResult> {
        const normalizedTable = normalizeClickHouseTable(table);
        if (!Array.isArray(rows)) {
            throw new ClickHouseRequestError('rows must be an array');
        }
        const queryOptions = createClickHouseQueryOptions(options, this.options.requestTimeoutMs);
        return this.withClient(
            client =>
                client.insert({
                    table: normalizedTable,
                    values: rows,
                    format: 'JSONEachRow',
                    ...queryOptions,
                }),
            options,
        );
    }

    /**
     * Runs advanced first-party SDK work while preserving database-pool ownership and shutdown tracking.
     * Any returned streams must be fully consumed inside the callback.
     */
    async withClient<T>(
        callback: (client: ClickHouseClient) => T | Promise<T>,
        options: ClickHouseRequestOptions = {},
    ): Promise<T> {
        if (typeof callback !== 'function') {
            throw new ClickHouseRequestError('callback must be a function');
        }
        assertClickHouseRequestOptions(options);
        const operation = this.runWithClient(callback, options.database);
        this.activeOperations.add(operation);
        try {
            return await operation;
        } finally {
            this.activeOperations.delete(operation);
        }
    }

    private async runWithClient<T>(
        callback: (client: ClickHouseClient) => T | Promise<T>,
        database: string | null | undefined,
    ): Promise<T> {
        const lease = await this.acquireClient(database);
        try {
            return await callback(lease.client);
        } finally {
            lease.release();
        }
    }

    async healthCheck(options: ClickHouseRequestOptions = {}): Promise<ClickHouseHealthResult> {
        const startedAt = Date.now();
        let database: string;
        try {
            assertClickHouseRequestOptions(options);
            database = resolveClickHouseDatabase(options.database, this.options.database, this.options.rootDatabase);
        } catch (error) {
            return {
                healthy: false,
                database: this.options.database,
                latencyMs: Date.now() - startedAt,
                error: this.errorMessage(error),
            };
        }

        try {
            const base = createClickHouseQueryOptions(
                {
                    ...options,
                    timeoutMs: options.timeoutMs ?? this.options.pingTimeoutMs,
                },
                this.options.pingTimeoutMs,
            );
            const { query_params: _queryParams, ...pingOptions } = base;
            const result = await this.withClient(client => client.ping({ select: true, ...pingOptions }), options);
            return {
                healthy: result.success,
                database,
                latencyMs: Date.now() - startedAt,
                ...(result.success ? {} : { error: result.error.message }),
            };
        } catch (error) {
            const message = this.errorMessage(error);
            this.logger.warn(`ClickHouse health check failed: ${message}`);
            return {
                healthy: false,
                database,
                latencyMs: Date.now() - startedAt,
                error: message,
            };
        }
    }

    async ping(): Promise<boolean> {
        return (await this.healthCheck()).healthy;
    }

    getStats(): ClickHouseServiceStats {
        return {
            activeOperations: this.activeOperations.size,
            cachedDatabaseClients: this.clientsByDatabase.size,
            databases: [this.options.database, ...this.clientsByDatabase.keys()],
            closing: this.shuttingDown,
        };
    }

    close(): Promise<void> {
        this.shuttingDown = true;
        this.closePromise ??= this.performClose();
        return this.closePromise;
    }

    async onModuleDestroy(): Promise<void> {
        await this.close();
    }

    private async performClose(): Promise<void> {
        const deadline = Date.now() + this.options.shutdownTimeoutMs;
        const errors: unknown[] = [];
        const pending = await this.settleTasks([...this.pendingClients.values(), ...this.activeOperations], deadline);
        if (pending.timedOut) {
            errors.push(new Error('Timed out waiting for active ClickHouse operations'));
        }

        const entries = [this.defaultEntry, ...this.clientsByDatabase.values()];
        this.clientsByDatabase.clear();
        const closeTasks = entries.map(entry => this.startClientClose(entry));
        const closed = await this.settleTasks(closeTasks, deadline);
        errors.push(...closed.errors);
        if (closed.timedOut) {
            errors.push(new Error('Timed out closing ClickHouse clients'));
        }

        if (errors.length > 0) {
            throw new ClickHouseShutdownError(errors);
        }
        this.logger.log('ClickHouse clients closed');
    }

    private async acquireClient(databaseOverride: string | null | undefined): Promise<ClientLease> {
        this.assertRunning();
        const database = resolveClickHouseDatabase(databaseOverride, this.options.database, this.options.rootDatabase);
        let entry: ClientEntry;
        if (database === this.options.database) {
            entry = this.defaultEntry;
        } else {
            const cached = this.clientsByDatabase.get(database);
            if (cached && !cached.closing) {
                entry = cached;
            } else {
                entry = await this.getOrCreateDatabaseClient(database);
                this.assertRunning();
            }
        }
        if (entry.closing) {
            throw new ClickHouseServiceClosedError();
        }
        if (entry.reserved) {
            entry.reserved = false;
        } else {
            entry.active += 1;
        }
        entry.lastUsed = ++this.sequence;
        let released = false;
        return {
            client: entry.client,
            release: () => {
                if (!released) {
                    released = true;
                    entry.active = Math.max(0, entry.active - 1);
                    entry.lastUsed = ++this.sequence;
                }
            },
        };
    }

    private getOrCreateDatabaseClient(database: string): Promise<ClientEntry> {
        const current = this.pendingClients.get(database);
        if (current) {
            return current;
        }
        const pending = this.createDatabaseClient(database).finally(() => {
            if (this.pendingClients.get(database) === pending) {
                this.pendingClients.delete(database);
            }
        });
        this.pendingClients.set(database, pending);
        return pending;
    }

    private createDatabaseClient(database: string): Promise<ClientEntry> {
        return this.withPoolLock(async () => {
            this.assertRunning();
            const existing = this.clientsByDatabase.get(database);
            if (existing && !existing.closing) {
                return existing;
            }

            if (this.clientsByDatabase.size >= this.options.maxDatabaseClients) {
                const victim = [...this.clientsByDatabase.values()]
                    .filter(entry => entry.active === 0 && !entry.closing)
                    .sort((left, right) => left.lastUsed - right.lastUsed)[0];
                if (!victim) {
                    throw new ClickHouseClientPoolExhaustedError(this.options.maxDatabaseClients);
                }
                await this.closeEvictedClient(victim);
                this.assertRunning();
            }

            const entry = this.createEntry(database, true);
            this.clientsByDatabase.set(database, entry);
            return entry;
        });
    }

    private async closeEvictedClient(entry: ClientEntry): Promise<void> {
        const task = this.startClientClose(entry);
        const settled = await this.settleTasks([task], Date.now() + this.options.requestTimeoutMs);
        if (settled.timedOut) {
            this.logger.warn(`Timed out closing evicted ClickHouse client for database '${entry.database}'`);
            void task.then(
                () => {
                    if (this.clientsByDatabase.get(entry.database) === entry) {
                        this.clientsByDatabase.delete(entry.database);
                    }
                },
                () => undefined,
            );
            throw new ClickHouseClientPoolExhaustedError(
                this.options.maxDatabaseClients,
                `evicted client for database '${entry.database}' did not close before the timeout`,
            );
        }
        for (const error of settled.errors) {
            this.logger.warn(
                `Failed closing evicted ClickHouse client for database '${entry.database}': ${this.errorMessage(error)}`,
            );
            throw new ClickHouseClientPoolExhaustedError(
                this.options.maxDatabaseClients,
                `evicted client for database '${entry.database}' failed to close`,
                error,
            );
        }
        this.clientsByDatabase.delete(entry.database);
    }

    private createEntry(database: string, reserved = false): ClientEntry {
        const clientOptions: ClickHouseClientConfigOptions = {
            ...this.options.clientOptions,
            database,
        };
        return {
            client: createClient(clientOptions),
            database,
            active: reserved ? 1 : 0,
            lastUsed: ++this.sequence,
            closing: false,
            reserved,
        };
    }

    private startClientClose(entry: ClientEntry): Promise<void> {
        entry.closing = true;
        entry.closeTask ??= Promise.resolve().then(() => entry.client.close());
        return entry.closeTask;
    }

    private async withPoolLock<T>(callback: () => Promise<T>): Promise<T> {
        const previous = this.poolTail;
        let release!: () => void;
        this.poolTail = new Promise<void>(resolve => {
            release = resolve;
        });
        await previous;
        try {
            return await callback();
        } finally {
            release();
        }
    }

    private async settleTasks(tasks: readonly Promise<unknown>[], deadline: number): Promise<TaskSettlement> {
        if (tasks.length === 0) {
            return { timedOut: false, errors: [] };
        }
        const settled = Promise.allSettled(tasks);
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            return { timedOut: true, errors: [] };
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
            settled.then(values => ({ values })),
            new Promise<{ timeout: true }>(resolve => {
                timer = setTimeout(() => resolve({ timeout: true }), remaining);
            }),
        ]);
        if (timer) {
            clearTimeout(timer);
        }
        if ('timeout' in result) {
            return { timedOut: true, errors: [] };
        }
        return {
            timedOut: false,
            errors: result.values
                .filter((value): value is PromiseRejectedResult => value.status === 'rejected')
                .map(value => value.reason),
        };
    }

    private assertRunning(): void {
        if (this.shuttingDown) {
            throw new ClickHouseServiceClosedError();
        }
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
