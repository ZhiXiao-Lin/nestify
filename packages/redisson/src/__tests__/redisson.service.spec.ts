import { Logger } from '@nestjs/common';
import {
    RedissonLockAcquisitionError,
    RedissonLockOwnershipError,
    RedissonLockReleaseError,
    RedissonPatternDeleteError,
    RedissonService,
    RedissonServiceClosedError,
} from '../redisson.service';

const mockQuit = jest.fn<Promise<void>, []>();
const mockGetLock = jest.fn<MockLock, [string, string?]>();
let mockRedis: RedisMock;

jest.mock('node-redisson', () => ({
    Redisson: class {
        get redis(): RedisMock {
            return mockRedis;
        }

        getLock(name: string, clientId?: string): MockLock {
            return mockGetLock(name, clientId);
        }

        quit(): Promise<void> {
            return mockQuit();
        }
    },
}));

function createRedisMock() {
    return {
        ping: jest.fn(async () => 'PONG'),
        get: jest.fn<Promise<string | null>, [string]>(async () => null),
        set: jest.fn(async () => 'OK'),
        setex: jest.fn(async () => 'OK'),
        del: jest.fn(async (...keys: string[]) => keys.length),
        exists: jest.fn(async () => 1),
        expire: jest.fn(async () => 1),
        incrby: jest.fn(async (_key: string, increment: number) => increment),
        decrby: jest.fn(async (_key: string, decrement: number) => -decrement),
        hset: jest.fn(async () => 1),
        hget: jest.fn(async () => null),
        hgetall: jest.fn(async () => ({})),
        hdel: jest.fn(async (_key: string, ...fields: string[]) => fields.length),
        eval: jest.fn(async () => null),
        evalsha: jest.fn(async () => null),
        scan: jest.fn(async () => ['0', []] as [string, string[]]),
        call: jest.fn(async () => 1),
        keys: jest.fn(async () => []),
        nodes: undefined as jest.Mock | undefined,
    };
}

function createLock(): MockLock {
    return {
        tryLock: jest.fn(async () => true),
        unlock: jest.fn(async () => undefined),
        isLocked: jest.fn(async () => true),
    };
}

function createService(
    overrides: Partial<{
        keyPrefix: string;
        shutdownTimeoutMs: number;
        patternScanCount: number;
        patternDeleteBatchSize: number;
    }> = {},
): RedissonService {
    return new RedissonService({
        redis: {
            options: {
                host: 'localhost',
                port: 6379,
                keyPrefix: overrides.keyPrefix,
            },
        },
        shutdownTimeoutMs: overrides.shutdownTimeoutMs,
        patternScanCount: overrides.patternScanCount,
        patternDeleteBatchSize: overrides.patternDeleteBatchSize,
    });
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function flushAsyncWork(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

type RedisMock = ReturnType<typeof createRedisMock>;
type MockLock = ReturnType<typeof createLock>;

describe('RedissonService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis = createRedisMock();
        mockQuit.mockResolvedValue(undefined);
        mockGetLock.mockImplementation(() => createLock());
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('checks connectivity and closes idempotently', async () => {
        const service = createService();

        await service.onModuleInit();
        await Promise.all([service.onModuleDestroy(), service.shutdown(), service.quit()]);

        expect(mockRedis.ping).toHaveBeenCalledTimes(1);
        expect(mockQuit).toHaveBeenCalledTimes(1);
        await expect(service.get('key')).rejects.toBeInstanceOf(RedissonServiceClosedError);
        expect(() => service.getRedis()).toThrow(RedissonServiceClosedError);
        expect(() => service.getLock('lock')).toThrow(RedissonServiceClosedError);
    });

    it('closes resources when initial connectivity fails', async () => {
        const failure = new Error('connection refused');
        mockRedis.ping.mockRejectedValueOnce(failure);
        const service = createService();

        await expect(service.onModuleInit()).rejects.toBe(failure);
        expect(mockQuit).toHaveBeenCalledTimes(1);
    });

    it('coalesces cache misses and preserves JSON-shaped strings', async () => {
        const service = createService();
        const pending = deferred<string>();
        const factory = jest.fn(() => pending.promise);

        const first = service.getOrSet('config', factory, 60);
        const second = service.getOrSet('config', factory, 60);
        await flushAsyncWork();
        expect(mockRedis.get).toHaveBeenCalledTimes(1);
        expect(factory).toHaveBeenCalledTimes(1);

        pending.resolve('{"enabled":true}');
        await expect(first).resolves.toBe('{"enabled":true}');
        await expect(second).resolves.toBe('{"enabled":true}');
        expect(mockRedis.setex).toHaveBeenCalledTimes(1);

        const stored = mockRedis.setex.mock.calls[0][2] as string;
        mockRedis.get.mockResolvedValueOnce(stored);
        await expect(service.getOrSet('config', jest.fn(), 60)).resolves.toBe('{"enabled":true}');
        mockRedis.get.mockResolvedValueOnce('');
        await expect(service.getOrSet('empty', jest.fn())).resolves.toBe('');
    });

    it('does not let a late cache factory overwrite an explicit write', async () => {
        const service = createService();
        const pending = deferred<string>();
        const loading = service.getOrSet('profile', () => pending.promise, 60);
        await flushAsyncWork();

        await service.set('profile', 'fresh');
        pending.resolve('stale');

        await expect(loading).resolves.toBe('stale');
        expect(mockRedis.set).toHaveBeenCalledWith('profile', 'fresh');
        expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('validates cache values and expiration times', async () => {
        const service = createService();

        await expect(service.getOrSet('key', () => 'value', 0)).rejects.toThrow('positive integer');
        await expect(service.getOrSet('key', () => undefined)).rejects.toThrow('cannot be undefined');
        await expect(service.setJSON('key', undefined)).rejects.toThrow('cannot be undefined');
        await expect(service.set('key', 'value', -1)).rejects.toThrow('positive integer');
        await expect(service.expire('key', 1.5)).rejects.toThrow('positive integer');
    });

    it('delegates validated string, JSON, hash, counter, and script helpers', async () => {
        const service = createService();
        mockRedis.get
            .mockResolvedValueOnce('{"enabled":true}')
            .mockResolvedValueOnce('not-json')
            .mockResolvedValueOnce('raw');
        mockRedis.hget.mockResolvedValueOnce('field-value');
        mockRedis.hgetall.mockResolvedValueOnce({ field: 'value' });
        mockRedis.eval.mockResolvedValueOnce({ ok: true });
        mockRedis.evalsha.mockResolvedValueOnce('cached-result');
        mockRedis.call.mockResolvedValueOnce('sha1');

        await service.setJSON('json', { enabled: true }, 30);
        await expect(service.getJSON<{ enabled: boolean }>('json')).resolves.toEqual({ enabled: true });
        await expect(service.getJSON('invalid')).resolves.toBeNull();
        await expect(service.exists('key')).resolves.toBe(true);
        await expect(service.expire('key', 30)).resolves.toBe(true);
        await expect(service.delete()).resolves.toBe(0);
        await expect(service.delete('one', 'two')).resolves.toBe(2);
        await expect(service.increment('counter', 2)).resolves.toBe(2);
        await expect(service.decrement('counter', 2)).resolves.toBe(-2);
        await expect(service.get('raw')).resolves.toBe('raw');
        await service.set('raw', 'value');
        await service.set('expiring', 'value', 30);
        await service.hset('hash', 'field', 'value');
        await expect(service.hget('hash', 'field')).resolves.toBe('field-value');
        await expect(service.hgetall('hash')).resolves.toEqual({ field: 'value' });
        await expect(service.hdel('hash')).resolves.toBe(0);
        await expect(service.hdel('hash', 'field')).resolves.toBe(1);
        await expect(service.eval<{ ok: boolean }>('return 1', ['key'], ['arg'])).resolves.toEqual({ ok: true });
        await expect(service.evalsha<string>('sha1', ['key'], ['arg'])).resolves.toBe('cached-result');
        await expect(service.scriptLoad('return 1')).resolves.toBe('sha1');
        expect(service.getRedis()).toBe(mockRedis);

        expect(mockRedis.setex).toHaveBeenCalledWith('json', 30, '{"enabled":true}');
        expect(mockRedis.eval).toHaveBeenCalledWith('return 1', 1, 'key', 'arg');
        expect(mockRedis.evalsha).toHaveBeenCalledWith('sha1', 1, 'key', 'arg');
        expect(mockRedis.call).toHaveBeenCalledWith('SCRIPT', 'LOAD', 'return 1');
    });

    it('preserves callback errors when lock release also fails', async () => {
        const service = createService();
        const lock = createLock();
        const callbackError = new Error('operation failed');
        lock.unlock.mockRejectedValueOnce(new Error('unlock failed'));
        mockGetLock.mockReturnValueOnce(lock);

        await expect(
            service.withLock('resource', () => {
                throw callbackError;
            }),
        ).rejects.toBe(callbackError);
    });

    it('surfaces acquisition and release failures with structured errors', async () => {
        const service = createService();
        const unavailable = createLock();
        unavailable.tryLock.mockResolvedValueOnce(false);
        mockGetLock.mockReturnValueOnce(unavailable);
        await expect(service.withLock('busy', jest.fn())).rejects.toBeInstanceOf(RedissonLockAcquisitionError);

        const brokenRelease = createLock();
        brokenRelease.unlock.mockRejectedValueOnce(new Error('unlock failed'));
        mockGetLock.mockReturnValueOnce(brokenRelease);
        await expect(service.withLock('resource', () => 'done')).rejects.toBeInstanceOf(RedissonLockReleaseError);
    });

    it('pairs managed tryLock and unlock calls with the same lock identity', async () => {
        const service = createService();
        const lock = createLock();
        mockGetLock.mockReturnValueOnce(lock);

        await expect(service.tryLock('resource')).resolves.toBe(true);
        await expect(service.tryLock('resource')).rejects.toBeInstanceOf(RedissonLockOwnershipError);
        await service.unlock('resource');

        expect(mockGetLock).toHaveBeenCalledTimes(1);
        expect(lock.unlock).toHaveBeenCalledTimes(1);
        await expect(service.unlock('resource')).rejects.toBeInstanceOf(RedissonLockOwnershipError);
    });

    it('deletes matching keys incrementally with SCAN and UNLINK', async () => {
        const service = createService({ keyPrefix: 'tenant[1]:' });
        mockRedis.scan
            .mockResolvedValueOnce(['7', ['tenant[1]:one', 'tenant[1]:two']])
            .mockResolvedValueOnce(['0', ['tenant[1]:three']]);

        await expect(service.deleteByPattern('*', { scanCount: 5, batchSize: 2 })).resolves.toBe(3);

        expect(mockRedis.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'tenant\\[1\\]:*', 'COUNT', 5);
        expect(mockRedis.call.mock.calls).toEqual([
            ['UNLINK', 'one'],
            ['UNLINK', 'two'],
            ['UNLINK', 'three'],
        ]);
        expect(mockRedis.keys).not.toHaveBeenCalled();
    });

    it('scans every Redis cluster master and supports DEL fallback', async () => {
        const firstNode = {
            scan: jest.fn(async () => ['0', ['cluster:first']] as [string, string[]]),
            call: jest.fn(async () => 1),
        };
        const secondNode = {
            scan: jest.fn(async () => ['0', ['cluster:second']] as [string, string[]]),
            call: jest.fn(async () => 1),
        };
        mockRedis.nodes = jest.fn(() => [firstNode, secondNode]);
        const service = new RedissonService({
            redis: {
                clusters: [{ host: 'redis-1', port: 6379 }],
                options: { redisOptions: { keyPrefix: 'cluster:' } },
            },
        });

        await expect(service.deleteByPattern('*', { useUnlink: false })).resolves.toBe(2);
        expect(mockRedis.nodes).toHaveBeenCalledWith('master');
        expect(firstNode.call).toHaveBeenCalledWith('DEL', 'first');
        expect(secondNode.call).toHaveBeenCalledWith('DEL', 'second');
    });

    it('reports partial pattern deletion failures', async () => {
        const service = createService();
        mockRedis.scan.mockResolvedValueOnce(['0', ['one', 'two']]);
        mockRedis.call.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('readonly replica'));

        const error = await service.deleteByPattern('*').catch(reason => reason);

        expect(error).toBeInstanceOf(RedissonPatternDeleteError);
        expect(error).toMatchObject({ deletedCount: 1, failures: [{ key: 'two' }] });
    });

    it('validates module and pattern scan configuration', async () => {
        expect(() => new RedissonService(undefined as never)).toThrow('redis is required');
        expect(
            () =>
                new RedissonService({
                    redis: { clusters: [] },
                }),
        ).toThrow('at least one node');
        expect(() => createService({ patternScanCount: 0 })).toThrow('positive integer');

        const service = createService();
        await expect(service.deleteByPattern('', {})).rejects.toThrow('non-empty string');
        await expect(service.deleteByPattern('*', { batchSize: 0 })).rejects.toThrow('positive integer');
        await expect(service.increment('counter', Number.NaN)).rejects.toThrow('safe integer');
        await expect(service.decrement('counter', 1.5)).rejects.toThrow('safe integer');
        await expect(service.eval('', [], [])).rejects.toThrow('cannot be empty');
        await expect(service.evalsha('', [], [])).rejects.toThrow('cannot be empty');
        await expect(service.scriptLoad('')).rejects.toThrow('cannot be empty');
    });

    it('drains active helpers and releases managed locks before shutdown', async () => {
        const service = createService();
        const factory = deferred<string>();
        const lock = createLock();
        mockGetLock.mockReturnValueOnce(lock);
        await service.tryLock('managed');
        const loading = service.getOrSet('profile', () => factory.promise, 60);
        await flushAsyncWork();

        const shutdown = service.onModuleDestroy();
        await flushAsyncWork();
        expect(mockQuit).not.toHaveBeenCalled();
        factory.resolve('loaded');
        await loading;
        await shutdown;

        expect(lock.unlock).toHaveBeenCalledTimes(1);
        expect(mockQuit).toHaveBeenCalledTimes(1);
    });

    it('bounds shutdown when an accepted operation never settles', async () => {
        const service = createService({ shutdownTimeoutMs: 5 });
        const factory = deferred<string>();
        const loading = service.getOrSet('profile', () => factory.promise, 60);
        await flushAsyncWork();

        await service.onModuleDestroy();
        expect(mockQuit).toHaveBeenCalledTimes(1);
        factory.resolve('late');
        await expect(loading).resolves.toBe('late');
        expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('releases a lock acquired after forced shutdown without running its callback', async () => {
        const service = createService({ shutdownTimeoutMs: 5 });
        const acquisition = deferred<boolean>();
        const lock = createLock();
        lock.tryLock.mockReturnValueOnce(acquisition.promise);
        mockGetLock.mockReturnValueOnce(lock);
        const callback = jest.fn(() => 'done');
        const operation = service.withLock('late-lock', callback);
        await flushAsyncWork();

        await service.onModuleDestroy();
        acquisition.resolve(true);

        await expect(operation).rejects.toBeInstanceOf(RedissonServiceClosedError);
        expect(lock.unlock).toHaveBeenCalledTimes(1);
        expect(callback).not.toHaveBeenCalled();
    });
});
