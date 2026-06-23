import type { RedisOptions } from 'ioredis';
import type { RedissonModuleOptions } from './redisson-module-options.interface';

export interface RedissonSingleNodeOptions {
    host?: string;
    port?: number | string;
    username?: string;
    password?: string | null;
    db?: number | string;
    keyPrefix?: string;
    options?: RedisOptions;
    eventAdapter?: RedissonModuleOptions['eventAdapter'];
    lockWatchdogTimeout?: bigint | number | string;
}

const hasValue = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null && value !== '';

const toNumber = (value: number | string | undefined): number | undefined => {
    if (!hasValue(value)) {
        return undefined;
    }

    return typeof value === 'number' ? value : Number(value);
};

const toBigInt = (value: bigint | number | string | undefined): bigint | undefined => {
    if (!hasValue(value)) {
        return undefined;
    }

    return typeof value === 'bigint' ? value : BigInt(value);
};

export const createRedissonModuleOptions = (options: RedissonSingleNodeOptions = {}): RedissonModuleOptions => {
    const redisOptions: RedisOptions = { ...(options.options ?? {}) };
    const port = toNumber(options.port);
    const db = toNumber(options.db);
    const lockWatchdogTimeout = toBigInt(options.lockWatchdogTimeout);

    if (hasValue(options.host)) {
        redisOptions.host = options.host;
    }

    if (port !== undefined) {
        redisOptions.port = port;
    }

    if (hasValue(options.username)) {
        redisOptions.username = options.username;
    }

    if (hasValue(options.password)) {
        redisOptions.password = options.password;
    }

    if (db !== undefined) {
        redisOptions.db = db;
    }

    if (hasValue(options.keyPrefix)) {
        redisOptions.keyPrefix = options.keyPrefix;
    }

    return {
        redis: { options: redisOptions },
        ...(options.eventAdapter ? { eventAdapter: options.eventAdapter } : {}),
        ...(lockWatchdogTimeout !== undefined ? { lockWatchdogTimeout } : {}),
    };
};
