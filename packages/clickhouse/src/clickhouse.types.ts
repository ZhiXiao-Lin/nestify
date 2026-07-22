import type {
    BaseQueryParams,
    ClickHouseAuth,
    ClickHouseClient,
    ClickHouseClientConfigOptions,
    ClickHouseSettings,
    CommandResult,
    DataFormat,
    InsertResult,
} from '@clickhouse/client';
import type { DynamicModule } from '@nestjs/common';

export const CLICKHOUSE_OPTIONS_TOKEN = 'CLICKHOUSE_OPTIONS';

export type {
    ClickHouseAuth,
    ClickHouseClient,
    ClickHouseClientConfigOptions,
    ClickHouseSettings,
    CommandResult,
    DataFormat,
    InsertResult,
};

export interface ClickHouseModuleOptions {
    /** ClickHouse HTTP(S) endpoint. Defaults to http://localhost:8123. */
    url?: string | URL;
    username?: string;
    password?: string;
    /** ClickHouse Cloud JWT. Mutually exclusive with username/password authentication. */
    accessToken?: string;
    database?: string;
    /** Database used when a request explicitly sets database: null. Defaults to default. */
    rootDatabase?: string;
    requestTimeoutMs?: number;
    pingTimeoutMs?: number;
    shutdownTimeoutMs?: number;
    maxOpenConnections?: number;
    /** Maximum cached database override clients, excluding the configured default client. */
    maxDatabaseClients?: number;
    application?: string;
    pathname?: string;
    compression?: ClickHouseClientConfigOptions['compression'];
    keepAlive?: ClickHouseClientConfigOptions['keep_alive'];
    tls?: ClickHouseClientConfigOptions['tls'];
    clickHouseSettings?: ClickHouseSettings;
    httpHeaders?: Record<string, string>;
    sessionId?: string;
    role?: string | string[];
    useMultipartParams?: boolean;
    useMultipartParamsAuto?: boolean;
    /**
     * Advanced first-party client options. Named convenience fields above take precedence.
     * Lifecycle-only options are never forwarded to the client.
     */
    clientOptions?: ClickHouseClientConfigOptions;
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
    abortSignal?: AbortSignal;
    sessionId?: string;
    role?: string | string[];
    auth?: BaseQueryParams['auth'];
    httpHeaders?: Record<string, string>;
    useMultipartParams?: boolean;
    useMultipartParamsAuto?: boolean;
}

export interface ClickHouseHealthResult {
    healthy: boolean;
    database: string;
    latencyMs: number;
    error?: string;
}

export interface ClickHouseServiceStats {
    activeOperations: number;
    cachedDatabaseClients: number;
    databases: string[];
    closing: boolean;
}

export class ClickHousePackageError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'ClickHousePackageError';
    }
}

export class ClickHouseConfigurationError extends ClickHousePackageError {
    constructor(message: string, cause?: unknown) {
        super(message, 'CLICKHOUSE_CONFIGURATION_ERROR', 500, cause === undefined ? undefined : { cause });
        this.name = 'ClickHouseConfigurationError';
    }
}

export class ClickHouseRequestError extends ClickHousePackageError {
    constructor(message: string) {
        super(message, 'CLICKHOUSE_REQUEST_ERROR', 400);
        this.name = 'ClickHouseRequestError';
    }
}

export class ClickHouseServiceClosedError extends ClickHousePackageError {
    constructor() {
        super('ClickHouse service is closing or already closed', 'CLICKHOUSE_SERVICE_CLOSED', 503);
        this.name = 'ClickHouseServiceClosedError';
    }
}

export class ClickHouseClientPoolExhaustedError extends ClickHousePackageError {
    constructor(maxDatabaseClients: number, detail?: string, cause?: unknown) {
        super(
            `ClickHouse database client pool cannot allocate another override client (capacity ${maxDatabaseClients})${detail ? `: ${detail}` : ''}`,
            'CLICKHOUSE_CLIENT_POOL_EXHAUSTED',
            503,
            cause === undefined ? undefined : { cause },
        );
        this.name = 'ClickHouseClientPoolExhaustedError';
    }
}

export class ClickHouseShutdownError extends ClickHousePackageError {
    constructor(public readonly errors: readonly unknown[]) {
        super(
            `ClickHouse shutdown completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`,
            'CLICKHOUSE_SHUTDOWN_ERROR',
            500,
            { cause: new AggregateError(errors, 'ClickHouse shutdown errors') },
        );
        this.name = 'ClickHouseShutdownError';
    }
}
