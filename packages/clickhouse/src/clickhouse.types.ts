import type { ClickHouseSettings } from '@clickhouse/client';
import type { DynamicModule } from '@nestjs/common';

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
