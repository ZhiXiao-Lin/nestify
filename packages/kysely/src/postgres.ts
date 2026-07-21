import { type KyselyConfig, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig } from 'pg';
import { createKyselyLogger, type KyselyLoggerOptions } from './kysely.logger';
import { type ConfiguredKyselyModuleOptions, KyselyConfigurationError } from './kysely-module-options.interface';

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

export const createPostgresPoolConfig = (options: PostgresKyselyOptions = {}): PoolConfig => {
    validatePostgresOptions(options);
    const pool: PoolConfig = { ...(options.pool ?? {}) };
    const port = optionalInteger(options.port, 'port', 1, 65_535) ?? optionalInteger(pool.port, 'pool.port', 1, 65_535);
    const max = optionalInteger(options.max, 'max', 1) ?? optionalInteger(pool.max, 'pool.max', 1);
    const min = optionalInteger(pool.min, 'pool.min', 0);

    if (hasText(options.host)) {
        pool.host = options.host;
    }

    if (port !== undefined) {
        pool.port = port;
    }

    if (hasText(options.user)) {
        pool.user = options.user;
    }

    if (hasText(options.password)) {
        pool.password = options.password;
    }

    if (hasText(options.database)) {
        pool.database = options.database;
    }

    if (max !== undefined) {
        pool.max = max;
    }
    if (min !== undefined) {
        pool.min = min;
    }
    if (min !== undefined && max !== undefined && min > max) {
        throw new KyselyConfigurationError('pool.min must be less than or equal to max.');
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

export const createPostgresKyselyModuleOptions = (
    options: PostgresKyselyOptions = {},
): ConfiguredKyselyModuleOptions => ({
    config: createPostgresKyselyConfig(options),
});

function validatePostgresOptions(options: PostgresKyselyOptions): void {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new KyselyConfigurationError('PostgreSQL options must be an object.');
    }
    if (
        options.pool !== undefined &&
        (!options.pool || typeof options.pool !== 'object' || Array.isArray(options.pool))
    ) {
        throw new KyselyConfigurationError('pool must be a PostgreSQL PoolConfig object.');
    }

    for (const field of ['host', 'user', 'password', 'database'] as const) {
        const value = options[field];
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new KyselyConfigurationError(`${field} must be a string.`);
        }
    }
}

function hasText(value: string | null | undefined): value is string {
    return value !== undefined && value !== null && value !== '';
}

function optionalInteger(
    value: number | string | null | undefined,
    name: string,
    minimum: number,
    maximum = Number.MAX_SAFE_INTEGER,
): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const number = typeof value === 'number' ? value : /^[+]?[0-9]+$/.test(value) ? Number(value) : Number.NaN;
    if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
        throw new KyselyConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
    return number;
}
