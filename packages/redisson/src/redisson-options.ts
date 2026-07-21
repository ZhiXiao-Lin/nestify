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
    shutdownTimeoutMs?: number;
    patternScanCount?: number;
    patternDeleteBatchSize?: number;
}

const hasValue = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null && value !== '';

const toNumber = (name: string, value: number | string | undefined): number | undefined => {
    if (!hasValue(value)) {
        return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        throw new RangeError(`${name} must be a finite number`);
    }
    return parsed;
};

const toBigInt = (name: string, value: bigint | number | string | undefined): bigint | undefined => {
    if (!hasValue(value)) {
        return undefined;
    }

    try {
        return typeof value === 'bigint' ? value : BigInt(value);
    } catch (error) {
        throw new RangeError(`${name} must be an integer`, { cause: error });
    }
};

export const createRedissonModuleOptions = (options: RedissonSingleNodeOptions = {}): RedissonModuleOptions => {
    const redisOptions: RedisOptions = { ...(options.options ?? {}) };
    const port = toNumber('port', options.port);
    const db = toNumber('db', options.db);
    const lockWatchdogTimeout = toBigInt('lockWatchdogTimeout', options.lockWatchdogTimeout);

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

    validateIntegerRange('port', redisOptions.port, 1, 65535);
    validateIntegerRange('db', redisOptions.db, 0);
    if (lockWatchdogTimeout !== undefined && lockWatchdogTimeout <= 0n) {
        throw new RangeError('lockWatchdogTimeout must be positive');
    }
    validatePositiveInteger('shutdownTimeoutMs', options.shutdownTimeoutMs);
    validatePositiveInteger('patternScanCount', options.patternScanCount);
    validatePositiveInteger('patternDeleteBatchSize', options.patternDeleteBatchSize);

    return {
        redis: { options: redisOptions },
        ...(options.eventAdapter ? { eventAdapter: options.eventAdapter } : {}),
        ...(lockWatchdogTimeout !== undefined ? { lockWatchdogTimeout } : {}),
        ...(options.shutdownTimeoutMs !== undefined ? { shutdownTimeoutMs: options.shutdownTimeoutMs } : {}),
        ...(options.patternScanCount !== undefined ? { patternScanCount: options.patternScanCount } : {}),
        ...(options.patternDeleteBatchSize !== undefined
            ? { patternDeleteBatchSize: options.patternDeleteBatchSize }
            : {}),
    };
};

function validateIntegerRange(name: string, value: number | undefined, minimum: number, maximum?: number): void {
    if (value === undefined) return;
    if (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
        const range = maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
        throw new RangeError(`${name} must be an integer ${range}`);
    }
}

function validatePositiveInteger(name: string, value: number | undefined): void {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw new RangeError(`${name} must be a positive integer`);
    }
}
