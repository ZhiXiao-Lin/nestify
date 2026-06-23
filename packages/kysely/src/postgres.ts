import { PostgresDialect, type KyselyConfig } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { createKyselyLogger, type KyselyLoggerOptions } from './kysely.logger';
import type { KyselyModuleOptions } from './kysely-module-options.interface';

export interface PostgresKyselyOptions {
    host?: string;
    port?: number | string;
    user?: string;
    password?: string;
    database?: string;
    max?: number | string;
    pool?: PoolConfig;
    log?: KyselyConfig['log'];
    logger?: KyselyLoggerOptions;
}

const hasValue = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null && value !== '';

const toNumber = (value: number | string | undefined): number | undefined => {
    if (!hasValue(value)) {
        return undefined;
    }

    return typeof value === 'number' ? value : Number(value);
};

export const createPostgresPoolConfig = (options: PostgresKyselyOptions = {}): PoolConfig => {
    const pool: PoolConfig = { ...(options.pool ?? {}) };
    const port = toNumber(options.port);
    const max = toNumber(options.max);

    if (hasValue(options.host)) {
        pool.host = options.host;
    }

    if (port !== undefined) {
        pool.port = port;
    }

    if (hasValue(options.user)) {
        pool.user = options.user;
    }

    if (hasValue(options.password)) {
        pool.password = options.password;
    }

    if (hasValue(options.database)) {
        pool.database = options.database;
    }

    if (max !== undefined) {
        pool.max = max;
    }

    return pool;
};

export const createPostgresKyselyConfig = (options: PostgresKyselyOptions = {}): KyselyConfig => {
    const log = options.log ?? (options.logger ? createKyselyLogger(options.logger) : undefined);

    return {
        dialect: new PostgresDialect({
            pool: new Pool(createPostgresPoolConfig(options)),
        }),
        ...(log !== undefined ? { log } : {}),
    };
};

export const createPostgresKyselyModuleOptions = (options: PostgresKyselyOptions = {}): KyselyModuleOptions => ({
    config: createPostgresKyselyConfig(options),
});
