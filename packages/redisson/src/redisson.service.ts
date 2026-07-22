import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { type IRLock, Redisson, type RedissonRedis } from 'node-redisson';
import { MODULE_OPTIONS_TOKEN } from './redisson.module-definition';
import type { RedissonModuleOptions } from './redisson-module-options.interface';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_SCAN_COUNT = 250;
const DEFAULT_DELETE_BATCH_SIZE = 50;
const CACHE_STRING_PREFIX = '\u0000nestify-redisson:string:v1:';

export interface DeleteByPatternOptions {
    /** Redis SCAN count hint. */
    scanCount?: number;
    /** Maximum number of delete commands executed concurrently. */
    batchSize?: number;
    /** Use non-blocking UNLINK instead of DEL. Defaults to true. */
    useUnlink?: boolean;
}

export interface PatternDeleteFailure {
    key: string;
    error: Error;
}

export class RedissonServiceClosedError extends Error {
    constructor() {
        super('RedissonService is shutting down and cannot start new operations');
        this.name = 'RedissonServiceClosedError';
    }
}

export class RedissonLockAcquisitionError extends Error {
    constructor(readonly lockKey: string) {
        super(`Failed to acquire lock: ${lockKey}`);
        this.name = 'RedissonLockAcquisitionError';
    }
}

export class RedissonLockOwnershipError extends Error {
    constructor(
        readonly lockKey: string,
        message: string,
    ) {
        super(`${message}: ${lockKey}`);
        this.name = 'RedissonLockOwnershipError';
    }
}

export class RedissonLockReleaseError extends Error {
    constructor(
        readonly lockKey: string,
        cause: unknown,
    ) {
        super(`Failed to release lock: ${lockKey}`, { cause });
        this.name = 'RedissonLockReleaseError';
    }
}

export class RedissonPatternDeleteError extends Error {
    readonly failures: PatternDeleteFailure[];

    constructor(
        readonly pattern: string,
        readonly deletedCount: number,
        failures: PatternDeleteFailure[],
        cause?: unknown,
    ) {
        super(`Failed to finish deleting keys matching pattern: ${pattern}`, { cause });
        this.name = 'RedissonPatternDeleteError';
        this.failures = failures;
    }
}

@Injectable()
export class RedissonService extends Redisson implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedissonService.name);
    private readonly inFlight = new Set<Promise<unknown>>();
    private readonly cacheLoads = new Map<string, Promise<unknown>>();
    private readonly managedLocks = new Map<string, IRLock>();
    private readonly lockAttempts = new Set<string>();
    private readonly shutdownTimeoutMs: number;
    private readonly patternScanCount: number;
    private readonly patternDeleteBatchSize: number;
    private readonly keyPrefix: string;
    private mutationEpoch = 0;
    private shuttingDown = false;
    private forceClosing = false;
    private shutdownPromise?: Promise<void>;
    private patternDeletePromise?: Promise<number>;

    constructor(@Inject(MODULE_OPTIONS_TOKEN) options: RedissonModuleOptions) {
        validateModuleOptions(options);
        super(options);
        this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
        this.patternScanCount = options.patternScanCount ?? DEFAULT_SCAN_COUNT;
        this.patternDeleteBatchSize = options.patternDeleteBatchSize ?? DEFAULT_DELETE_BATCH_SIZE;
        this.keyPrefix = resolveKeyPrefix(options);
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.redis.ping();
            this.logger.log('Successfully connected to Redis via Redisson');
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error);
            await this.shutdown();
            throw error;
        }
    }

    onModuleDestroy(): Promise<void> {
        return this.shutdown();
    }

    override quit(): Promise<void> {
        return this.shutdown();
    }

    shutdown(): Promise<void> {
        this.shutdownPromise ??= this.closeResources();
        return this.shutdownPromise;
    }

    override getLock(name: string, clientId?: string): IRLock {
        this.assertActive();
        validateKey('lock name', name);
        return super.getLock(name, clientId);
    }

    async withLock<T>(key: string, callback: () => Promise<T> | T, waitTime = 5000, leaseTime = 10000): Promise<T> {
        return this.execute(async () => {
            validateKey('lock key', key);
            validateWaitTime(waitTime);
            validateLeaseTime(leaseTime);
            const lock = super.getLock(key);
            const acquired = await lock.tryLock(waitTime, leaseTime);
            if (!acquired) {
                throw new RedissonLockAcquisitionError(key);
            }
            if (this.forceClosing) {
                await releaseDuringShutdown(lock, key);
                throw new RedissonServiceClosedError();
            }

            let result: T;
            try {
                this.logger.debug(`Lock acquired: ${key}`);
                result = await callback();
            } catch (error) {
                try {
                    await lock.unlock();
                    this.logger.debug(`Lock released after callback error: ${key}`);
                } catch (releaseError) {
                    this.logger.error(`Lock release also failed after callback error: ${key}`, releaseError);
                }
                throw error;
            }

            try {
                await lock.unlock();
                this.logger.debug(`Lock released: ${key}`);
            } catch (error) {
                throw new RedissonLockReleaseError(key, error);
            }
            return result;
        });
    }

    getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
        return this.execute(async () => {
            validateKey('cache key', key);
            validateTtl(ttl);

            const existing = this.cacheLoads.get(key);
            if (existing) {
                return existing as Promise<T>;
            }

            if (this.patternDeletePromise) {
                await this.patternDeletePromise.catch(() => undefined);
            }

            const loading = this.loadCacheValue(key, factory, ttl);
            this.cacheLoads.set(key, loading);
            void loading.then(
                () => {
                    if (this.cacheLoads.get(key) === loading) this.cacheLoads.delete(key);
                },
                () => {
                    if (this.cacheLoads.get(key) === loading) this.cacheLoads.delete(key);
                },
            );
            return loading;
        });
    }

    deleteByPattern(pattern: string, options: DeleteByPatternOptions = {}): Promise<number> {
        return this.execute(async () => {
            validatePattern(pattern);
            const scanCount = options.scanCount ?? this.patternScanCount;
            const batchSize = options.batchSize ?? this.patternDeleteBatchSize;
            validatePositiveInteger('scanCount', scanCount);
            validatePositiveInteger('batchSize', batchSize);

            while (this.patternDeletePromise) {
                await this.patternDeletePromise.catch(() => undefined);
            }

            this.mutationEpoch += 1;
            const deletion = this.scanAndDelete(pattern, scanCount, batchSize, options.useUnlink ?? true);
            this.patternDeletePromise = deletion;
            try {
                return await deletion;
            } finally {
                this.mutationEpoch += 1;
                if (this.patternDeletePromise === deletion) {
                    this.patternDeletePromise = undefined;
                }
            }
        });
    }

    setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateTtl(ttl);
            const serialized = JSON.stringify(value);
            if (serialized === undefined) {
                throw new TypeError('JSON value cannot be undefined');
            }
            await this.writeValue(key, serialized, ttl);
            this.mutationEpoch += 1;
        });
    }

    getJSON<T>(key: string): Promise<T | null> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            const value = await this.redis.get(key);
            if (value === null) return null;

            try {
                return JSON.parse(value) as T;
            } catch (error) {
                this.logger.error(`Failed to parse JSON for key: ${key}`, error);
                return null;
            }
        });
    }

    exists(key: string): Promise<boolean> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            return (await this.redis.exists(key)) === 1;
        });
    }

    expire(key: string, ttl: number): Promise<boolean> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateTtl(ttl);
            const result = await this.redis.expire(key, ttl);
            if (result === 1) this.mutationEpoch += 1;
            return result === 1;
        });
    }

    delete(...keys: string[]): Promise<number> {
        return this.execute(async () => {
            if (keys.length === 0) return 0;
            for (const key of keys) validateKey('Redis key', key);
            const deleted = await this.redis.del(...keys);
            if (deleted > 0) this.mutationEpoch += 1;
            return deleted;
        });
    }

    increment(key: string, increment = 1): Promise<number> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateSafeInteger('increment', increment);
            const value = await this.redis.incrby(key, increment);
            this.mutationEpoch += 1;
            return value;
        });
    }

    decrement(key: string, decrement = 1): Promise<number> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateSafeInteger('decrement', decrement);
            const value = await this.redis.decrby(key, decrement);
            this.mutationEpoch += 1;
            return value;
        });
    }

    get(key: string): Promise<string | null> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            return this.redis.get(key);
        });
    }

    set(key: string, value: string, ttl?: number): Promise<void> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateTtl(ttl);
            await this.writeValue(key, value, ttl);
            this.mutationEpoch += 1;
        });
    }

    hset(key: string, field: string, value: string): Promise<void> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateKey('hash field', field);
            await this.redis.hset(key, field, value);
            this.mutationEpoch += 1;
        });
    }

    hget(key: string, field: string): Promise<string | null> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            validateKey('hash field', field);
            return this.redis.hget(key, field);
        });
    }

    hgetall(key: string): Promise<Record<string, string>> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            return this.redis.hgetall(key);
        });
    }

    hdel(key: string, ...fields: string[]): Promise<number> {
        return this.execute(async () => {
            validateKey('Redis key', key);
            if (fields.length === 0) return 0;
            for (const field of fields) validateKey('hash field', field);
            const deleted = await this.redis.hdel(key, ...fields);
            if (deleted > 0) this.mutationEpoch += 1;
            return deleted;
        });
    }

    eval<T = any>(script: string, keys: string[], args: string[]): Promise<T> {
        return this.execute(async () => {
            if (script.length === 0) throw new TypeError('Lua script cannot be empty');
            for (const key of keys) validateKey('Redis key', key);
            const result = await this.redis.eval(script, keys.length, ...keys, ...args);
            this.mutationEpoch += 1;
            return result as T;
        });
    }

    evalsha<T = any>(sha1: string, keys: string[], args: string[]): Promise<T> {
        return this.execute(async () => {
            if (sha1.length === 0) throw new TypeError('Lua script SHA1 cannot be empty');
            for (const key of keys) validateKey('Redis key', key);
            const result = await this.redis.evalsha(sha1, keys.length, ...keys, ...args);
            this.mutationEpoch += 1;
            return result as T;
        });
    }

    scriptLoad(script: string): Promise<string> {
        return this.execute(async () => {
            if (script.length === 0) throw new TypeError('Lua script cannot be empty');
            return (await this.redis.call('SCRIPT', 'LOAD', script)) as string;
        });
    }

    getRedis(): RedissonRedis {
        this.assertActive();
        return this.redis;
    }

    tryLock(key: string, waitTime = 5000, leaseTime = 10000): Promise<boolean> {
        return this.execute(async () => {
            validateKey('lock key', key);
            validateWaitTime(waitTime);
            validateLeaseTime(leaseTime);
            if (this.managedLocks.has(key) || this.lockAttempts.has(key)) {
                throw new RedissonLockOwnershipError(key, 'Lock is already managed by this service');
            }

            this.lockAttempts.add(key);
            const lock = super.getLock(key);
            try {
                const acquired = await lock.tryLock(waitTime, leaseTime);
                if (acquired && this.shuttingDown) {
                    await releaseDuringShutdown(lock, key);
                    throw new RedissonServiceClosedError();
                }
                if (acquired) this.managedLocks.set(key, lock);
                return acquired;
            } finally {
                this.lockAttempts.delete(key);
            }
        });
    }

    unlock(key: string): Promise<void> {
        return this.execute(async () => {
            validateKey('lock key', key);
            const lock = this.managedLocks.get(key);
            if (!lock) {
                throw new RedissonLockOwnershipError(key, 'Lock is not owned by this service');
            }
            try {
                await lock.unlock();
                this.managedLocks.delete(key);
            } catch (error) {
                throw new RedissonLockReleaseError(key, error);
            }
        });
    }

    private async loadCacheValue<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
        let revision = this.mutationEpoch;
        while (true) {
            const cached = await this.redis.get(key);
            if (revision !== this.mutationEpoch) {
                revision = this.mutationEpoch;
                continue;
            }
            if (cached !== null) {
                return deserializeCacheValue<T>(cached);
            }

            const value = await factory();
            if (!this.shuttingDown && revision === this.mutationEpoch) {
                await this.writeValue(key, serializeCacheValue(value), ttl);
            }
            return value;
        }
    }

    private async writeValue(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl === undefined) {
            await this.redis.set(key, value);
        } else {
            await this.redis.setex(key, ttl, value);
        }
    }

    private async scanAndDelete(
        pattern: string,
        scanCount: number,
        batchSize: number,
        useUnlink: boolean,
    ): Promise<number> {
        const physicalPattern = `${escapeRedisGlob(this.keyPrefix)}${pattern}`;
        const clients = getScanClients(this.redis);
        let deletedCount = 0;

        try {
            for (const client of clients) {
                let cursor = '0';
                do {
                    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', physicalPattern, 'COUNT', scanCount);
                    cursor = nextCursor;
                    for (let index = 0; index < keys.length; index += batchSize) {
                        const batch = keys.slice(index, index + batchSize);
                        const results = await Promise.allSettled(
                            batch.map(key =>
                                client.call(useUnlink ? 'UNLINK' : 'DEL', removeKeyPrefix(key, this.keyPrefix)),
                            ),
                        );
                        const failures: PatternDeleteFailure[] = [];
                        for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
                            const result = results[resultIndex];
                            if (result.status === 'fulfilled') {
                                deletedCount += Number(result.value);
                            } else {
                                failures.push({ key: batch[resultIndex], error: normalizeError(result.reason) });
                            }
                        }
                        if (failures.length > 0) {
                            throw new RedissonPatternDeleteError(pattern, deletedCount, failures);
                        }
                    }
                } while (cursor !== '0');
            }
            return deletedCount;
        } catch (error) {
            if (error instanceof RedissonPatternDeleteError) throw error;
            throw new RedissonPatternDeleteError(pattern, deletedCount, [], error);
        }
    }

    private execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.shuttingDown) {
            return Promise.reject(new RedissonServiceClosedError());
        }

        const pending = Promise.resolve().then(operation);
        this.inFlight.add(pending);
        void pending.then(
            () => this.inFlight.delete(pending),
            () => this.inFlight.delete(pending),
        );
        return pending;
    }

    private assertActive(): void {
        if (this.shuttingDown) {
            throw new RedissonServiceClosedError();
        }
    }

    private async closeResources(): Promise<void> {
        this.shuttingDown = true;
        this.logger.log('Closing Redisson connections...');
        const drained = await settleWithin([...this.inFlight], this.shutdownTimeoutMs);
        if (!drained) {
            this.logger.warn(`Timed out after ${this.shutdownTimeoutMs}ms while draining Redis helper operations`);
        }
        this.forceClosing = true;

        const lockEntries = [...this.managedLocks.entries()];
        const lockReleases = lockEntries.map(async ([key, lock]) => {
            try {
                await lock.unlock();
            } catch (error) {
                this.logger.error(`Failed to release managed lock during shutdown: ${key}`, error);
            }
        });
        const locksReleased = await settleWithin(lockReleases, this.shutdownTimeoutMs);
        if (!locksReleased) {
            this.logger.warn(`Timed out after ${this.shutdownTimeoutMs}ms while releasing managed Redis locks`);
        }
        this.managedLocks.clear();
        this.lockAttempts.clear();
        this.cacheLoads.clear();

        await super.quit();
        this.logger.log('Redisson connections closed');
    }
}

interface RedisScanClient {
    scan(cursor: string, ...args: Array<string | number>): Promise<[string, string[]]>;
    call(command: string, ...args: string[]): Promise<unknown>;
}

function getScanClients(redis: RedissonRedis): RedisScanClient[] {
    const candidate = redis as unknown as {
        nodes?: (role: 'master') => unknown[];
    };
    if (typeof candidate.nodes === 'function') {
        const nodes = candidate.nodes('master');
        if (nodes.length === 0) {
            throw new Error('Redis cluster has no available master nodes');
        }
        return nodes as RedisScanClient[];
    }
    return [redis as unknown as RedisScanClient];
}

function resolveKeyPrefix(options: RedissonModuleOptions): string {
    const redis = options.redis as
        | { options: { keyPrefix?: string } }
        | { clusters: unknown[]; options?: { redisOptions?: { keyPrefix?: string } } };
    return 'clusters' in redis ? (redis.options?.redisOptions?.keyPrefix ?? '') : (redis.options.keyPrefix ?? '');
}

function serializeCacheValue(value: unknown): string {
    if (value === undefined) {
        throw new TypeError('Cache value cannot be undefined');
    }
    if (typeof value === 'string') {
        if (value.startsWith(CACHE_STRING_PREFIX) || isJson(value)) {
            return `${CACHE_STRING_PREFIX}${value}`;
        }
        return value;
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
        throw new TypeError('Cache value cannot be serialized');
    }
    return serialized;
}

function deserializeCacheValue<T>(value: string): T {
    if (value.startsWith(CACHE_STRING_PREFIX)) {
        return value.slice(CACHE_STRING_PREFIX.length) as T;
    }
    try {
        return JSON.parse(value) as T;
    } catch {
        return value as T;
    }
}

function isJson(value: string): boolean {
    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

function escapeRedisGlob(value: string): string {
    return value.replace(/([*?[\]\\])/g, '\\$1');
}

function removeKeyPrefix(key: string, prefix: string): string {
    return prefix.length > 0 && key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

async function releaseDuringShutdown(lock: IRLock, key: string): Promise<void> {
    try {
        await lock.unlock();
    } catch (error) {
        throw new RedissonLockReleaseError(key, error);
    }
}

async function settleWithin(promises: Promise<unknown>[], timeoutMs: number): Promise<boolean> {
    if (promises.length === 0) return true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<false>(resolve => {
        timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const settled = Promise.allSettled(promises).then(() => true as const);
    const result = await Promise.race([settled, timeout]);
    if (timer) clearTimeout(timer);
    return result;
}

function validateModuleOptions(options: RedissonModuleOptions | undefined): asserts options is RedissonModuleOptions {
    if (!options?.redis) {
        throw new TypeError('RedissonModuleOptions.redis is required');
    }
    const redis = options.redis as {
        clusters?: unknown;
        options?: { port?: number; db?: number; redisOptions?: { port?: number; db?: number } };
    };
    let redisOptions: { port?: number; db?: number } | undefined;
    if ('clusters' in redis) {
        if (!Array.isArray(redis.clusters) || redis.clusters.length === 0) {
            throw new TypeError('Redisson cluster configuration requires at least one node');
        }
        if (redis.clusters.some(node => node === null || node === undefined || node === '')) {
            throw new TypeError('Redisson cluster nodes must be non-empty');
        }
        redisOptions = redis.options?.redisOptions;
    } else {
        if (!redis.options || typeof redis.options !== 'object') {
            throw new TypeError('Redisson single-node configuration requires Redis options');
        }
        redisOptions = redis.options;
    }
    validateIntegerRange('Redis port', redisOptions?.port, 1, 65535);
    validateIntegerRange('Redis database', redisOptions?.db, 0);
    if (
        options.lockWatchdogTimeout !== undefined &&
        (typeof options.lockWatchdogTimeout !== 'bigint' || options.lockWatchdogTimeout <= 0n)
    ) {
        throw new RangeError('lockWatchdogTimeout must be a positive bigint');
    }
    if (options.eventAdapter !== undefined && options.eventAdapter !== 'pubsub' && options.eventAdapter !== 'streams') {
        throw new TypeError('eventAdapter must be either pubsub or streams');
    }
    validatePositiveInteger('shutdownTimeoutMs', options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
    validatePositiveInteger('patternScanCount', options.patternScanCount ?? DEFAULT_SCAN_COUNT);
    validatePositiveInteger('patternDeleteBatchSize', options.patternDeleteBatchSize ?? DEFAULT_DELETE_BATCH_SIZE);
}

function validateKey(name: string, value: string): void {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
}

function validatePattern(pattern: string): void {
    validateKey('Redis pattern', pattern);
}

function validateTtl(ttl: number | undefined): void {
    if (ttl !== undefined && (!Number.isInteger(ttl) || ttl <= 0)) {
        throw new RangeError('Redis TTL must be a positive integer in seconds');
    }
}

function validateWaitTime(waitTime: number): void {
    if (!Number.isFinite(waitTime) || waitTime < 0) {
        throw new RangeError('Lock waitTime must be a non-negative finite number');
    }
}

function validateLeaseTime(leaseTime: number): void {
    if (!Number.isFinite(leaseTime) || leaseTime <= 0) {
        throw new RangeError('Lock leaseTime must be a positive finite number');
    }
}

function validateSafeInteger(name: string, value: number): void {
    if (!Number.isSafeInteger(value)) {
        throw new RangeError(`${name} must be a safe integer`);
    }
}

function validatePositiveInteger(name: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive integer`);
    }
}

function validateIntegerRange(name: string, value: number | undefined, minimum: number, maximum?: number): void {
    if (value === undefined) return;
    if (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
        const range = maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
        throw new RangeError(`${name} must be an integer ${range}`);
    }
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}
