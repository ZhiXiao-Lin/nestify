import 'reflect-metadata';
import type { RedissonService } from '@a3s-lab/redisson';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import {
    CACHE_KEY,
    Cache,
    type CacheDecoratorOptions,
    CacheInterceptor,
    CacheService,
    CacheServiceClosedError,
    TtlCache,
} from '../cache';

describe('CacheService', () => {
    it('preserves JSON-looking strings and remains compatible with legacy values', async () => {
        const harness = createRedisHarness();
        const service = new CacheService(harness.redis);

        await service.set('literal', 'null');
        const stored = harness.set.mock.calls[0]?.[1] as string;
        expect(stored).not.toBe('null');

        harness.get.mockResolvedValueOnce(stored).mockResolvedValueOnce('');
        await expect(service.get<string>('literal')).resolves.toBe('null');
        await expect(service.get<string>('legacy-empty')).resolves.toBe('');
        expect(service.getStats()).toMatchObject({ hits: 2, misses: 0, sets: 1 });
    });

    it('waits for an in-flight getOrSet during shutdown and rejects later operations', async () => {
        const harness = createRedisHarness();
        const loaded = deferred<string>();
        const factory = jest.fn(() => loaded.promise);
        const service = new CacheService(harness.redis);

        const loading = service.getOrSet('profile', factory);
        await waitForMock(factory);

        let shutdownSettled = false;
        const shutdown = service.onModuleDestroy().then(() => {
            shutdownSettled = true;
        });
        await Promise.resolve();
        expect(shutdownSettled).toBe(false);

        loaded.resolve('fresh');
        await expect(loading).resolves.toBe('fresh');
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.set).toHaveBeenCalledTimes(1);
        expect(service.getStats()).toMatchObject({ hits: 0, misses: 0, sets: 0 });
        await expect(service.get('after-shutdown')).rejects.toBeInstanceOf(CacheServiceClosedError);
        expect(harness.get).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent getOrSet factories for the same fully-qualified key', async () => {
        const harness = createRedisHarness();
        const loaded = deferred<string>();
        const factory = jest.fn(() => loaded.promise);
        const service = new CacheService(harness.redis);

        const first = service.getOrSet('profile', factory, { prefix: 'users' });
        const second = service.getOrSet('profile', factory, { prefix: 'users' });
        await waitForMock(factory);
        loaded.resolve('fresh');

        await expect(Promise.all([first, second])).resolves.toEqual(['fresh', 'fresh']);
        expect(factory).toHaveBeenCalledTimes(1);
        expect(harness.get).toHaveBeenCalledTimes(1);
        expect(harness.set).toHaveBeenCalledTimes(1);
    });

    it('treats an enveloped null as a cache hit in getOrSet', async () => {
        const harness = createRedisHarness();
        const service = new CacheService(harness.redis);
        await service.set('nullable', null);
        const stored = harness.set.mock.calls[0]?.[1] as string;
        harness.get.mockResolvedValueOnce(stored);
        const factory = jest.fn(async () => 'replacement');

        await expect(service.getOrSet<null | string>('nullable', factory)).resolves.toBeNull();
        expect(factory).not.toHaveBeenCalled();
        expect(harness.set).toHaveBeenCalledTimes(1);
    });

    it('does not let an older load overwrite an explicit set or delete', async () => {
        const setHarness = createRedisHarness();
        const setService = new CacheService(setHarness.redis);
        const oldSetLoad = deferred<string>();
        const loadingBeforeSet = setService.getOrSet('profile', () => oldSetLoad.promise);
        await waitForMock(setHarness.get);
        await setService.set('profile', 'authoritative');
        oldSetLoad.resolve('stale');

        await expect(loadingBeforeSet).resolves.toBe('stale');
        expect(setHarness.set).toHaveBeenCalledTimes(1);
        expect(setHarness.set.mock.calls[0]?.[1]).toContain('authoritative');

        const deleteHarness = createRedisHarness();
        const deleteService = new CacheService(deleteHarness.redis);
        const oldDeleteLoad = deferred<string>();
        const loadingBeforeDelete = deleteService.getOrSet('profile', () => oldDeleteLoad.promise);
        await waitForMock(deleteHarness.get);
        await deleteService.delete('profile');
        oldDeleteLoad.resolve('stale');

        await expect(loadingBeforeDelete).resolves.toBe('stale');
        expect(deleteHarness.set).not.toHaveBeenCalled();
        expect(deleteHarness.delete).toHaveBeenCalledTimes(1);
    });

    it('starts a fresh single-flight generation after explicit invalidation', async () => {
        const harness = createRedisHarness();
        const service = new CacheService(harness.redis);
        const oldLoad = deferred<string>();
        const oldFactory = jest.fn(() => oldLoad.promise);
        const first = service.getOrSet('profile', oldFactory);
        await waitForMock(oldFactory);

        await service.delete('profile');
        const newFactory = jest.fn(async () => 'new');
        const second = service.getOrSet('profile', newFactory);
        await expect(second).resolves.toBe('new');
        oldLoad.resolve('old');
        await expect(first).resolves.toBe('old');

        expect(oldFactory).toHaveBeenCalledTimes(1);
        expect(newFactory).toHaveBeenCalledTimes(1);
        expect(harness.set).toHaveBeenCalledTimes(1);
        expect(harness.set.mock.calls[0]?.[1]).toContain('new');
    });

    it('validates keys, cache options, factories, and top-level serializability', async () => {
        const service = new CacheService(createRedisHarness().redis);
        await expect(service.get(' ')).rejects.toThrow('key must not be empty');
        await expect(service.get('bad\nkey')).rejects.toThrow('control characters');
        await expect(service.get('x'.repeat(1_025))).rejects.toThrow('cannot exceed');
        await expect(service.get('key', { ttl: 0 })).rejects.toThrow('ttl');
        await expect(service.get('key', { prefix: 'bad prefix' })).rejects.toThrow('prefix');
        await expect(service.get('key', { prefix: 'x'.repeat(129) })).rejects.toThrow('cannot exceed');
        await expect(service.get('key', { touch: 'yes' as never })).rejects.toThrow('touch');
        await expect(service.get('key', null as never)).rejects.toThrow('options');
        await expect(service.getOrSet('key', undefined as never)).rejects.toThrow('factory');
        await expect(service.set('key', undefined)).rejects.toThrow('cannot be undefined');
        await expect(service.set('key', () => 'value')).rejects.toThrow('cannot be serialized');
        await expect(service.set('key', Symbol('value'))).rejects.toThrow('cannot be serialized');
        await expect(service.set(' ', 'value')).rejects.toThrow('key must not be empty');
    });

    it('touches hits, tracks misses and deletes, and returns immutable stats snapshots', async () => {
        const harness = createRedisHarness();
        const service = new CacheService(harness.redis);
        harness.get.mockResolvedValueOnce('\u0000nestify-cache:v1:{"value":42}').mockResolvedValueOnce(null);

        await expect(service.get<number>('hit', { ttl: 20, touch: true })).resolves.toBe(42);
        await expect(service.get('miss')).resolves.toBeNull();
        await service.delete('deleted');

        expect(harness.expire).toHaveBeenCalledWith('cache:cache:hit', 20);
        const stats = service.getStats();
        expect(stats).toEqual({ hits: 1, misses: 1, sets: 0, deletes: 1, hitRate: 0.5 });
        expect(Object.isFrozen(stats)).toBe(true);
    });

    it('rejects malformed versioned envelopes while preserving legacy JSON and raw strings', async () => {
        const harness = createRedisHarness();
        const service = new CacheService(harness.redis);
        harness.get
            .mockResolvedValueOnce('\u0000nestify-cache:v1:{}')
            .mockResolvedValueOnce('{"legacy":true}')
            .mockResolvedValueOnce('legacy raw');

        await expect(service.get('bad')).rejects.toThrow('envelope is invalid');
        await expect(service.get('json')).resolves.toEqual({ legacy: true });
        await expect(service.get('raw')).resolves.toBe('legacy raw');
    });

    it('exposes an idempotent closed lifecycle', async () => {
        const service = new CacheService(createRedisHarness().redis);
        expect(service.isClosed).toBe(false);
        const shutdown = service.shutdown();
        expect(service.isClosed).toBe(true);
        expect(service.onModuleDestroy()).toBe(shutdown);
        await expect(shutdown).resolves.toBeUndefined();
        await expect(service.set('after', 'value')).rejects.toBeInstanceOf(CacheServiceClosedError);
    });
});

describe('CacheInterceptor isolation', () => {
    it('normalizes header names and object key order while isolating private credentials', async () => {
        const first = await captureCacheKey({
            method: 'get',
            path: '/orders',
            query: { page: '1', filter: 'open' },
            headers: { Authorization: 'Bearer first', Accept: 'application/json', Host: 'api.example.test' },
            user: { id: 'user-1', tenantId: 'tenant-1' },
        });
        const equivalent = await captureCacheKey({
            method: 'GET',
            path: '/orders',
            query: { filter: 'open', page: '1' },
            headers: { host: 'api.example.test', accept: 'application/json', authorization: 'Bearer first' },
            user: { tenantId: 'tenant-1', id: 'user-1' },
        });
        const otherCredential = await captureCacheKey({
            method: 'GET',
            path: '/orders',
            query: { filter: 'open', page: '1' },
            headers: { host: 'api.example.test', accept: 'application/json', authorization: 'Bearer second' },
            user: { tenantId: 'tenant-1', id: 'user-1' },
        });

        expect(equivalent).toBe(first);
        expect(otherCredential).not.toBe(first);
        expect(first).not.toContain('Bearer');
    });

    it('shares explicit public caches across identities but never across inferred tenants or hosts', async () => {
        const options = { scope: 'public' } satisfies CacheDecoratorOptions;
        const tenantOne = await captureCacheKey(
            {
                method: 'GET',
                path: '/catalog',
                headers: { authorization: 'Bearer one', host: 'one.example.test' },
                user: { id: 'user-1', tenantId: 'tenant-1' },
            },
            options,
        );
        const sameTenant = await captureCacheKey(
            {
                method: 'GET',
                path: '/catalog',
                headers: { authorization: 'Bearer two', host: 'one.example.test' },
                user: { id: 'user-2', tenantId: 'tenant-1' },
            },
            options,
        );
        const tenantTwo = await captureCacheKey(
            {
                method: 'GET',
                path: '/catalog',
                headers: { authorization: 'Bearer two', host: 'one.example.test' },
                user: { id: 'user-2', tenantId: 'tenant-2' },
            },
            options,
        );
        const otherHost = await captureCacheKey(
            {
                method: 'GET',
                path: '/catalog',
                headers: { authorization: 'Bearer two', host: 'two.example.test' },
                user: { id: 'user-2', tenantId: 'tenant-1' },
            },
            options,
        );

        expect(sameTenant).toBe(tenantOne);
        expect(tenantTwo).not.toBe(tenantOne);
        expect(otherHost).not.toBe(tenantOne);
    });

    it('uses type-aware key material instead of conflating bigint and string values', async () => {
        const bigintKey = await captureCacheKey({ method: 'POST', path: '/lookup', body: { id: 1n }, headers: {} });
        const stringKey = await captureCacheKey({ method: 'POST', path: '/lookup', body: { id: '1' }, headers: {} });

        expect(bigintKey).not.toBe(stringKey);
    });
});

describe('CacheInterceptor failure and Observable semantics', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
    });

    it('bypasses key-generation and Redis read failures without logging sensitive details', async () => {
        const keyFailure = new Error('Bearer key-generation-secret');
        const user = {};
        Object.defineProperty(user, 'token', {
            enumerable: true,
            get: () => {
                throw keyFailure;
            },
        });
        const keyHarness = createInterceptorHarness({}, { user, headers: {} });

        await expect(
            lastValueFrom(await keyHarness.interceptor.intercept(keyHarness.context, keyHarness.next)),
        ).resolves.toBe('fresh');
        expect(keyHarness.get).not.toHaveBeenCalled();

        const readFailure = new Error('redis://user:password@cache.internal');
        const readHarness = createInterceptorHarness({}, { headers: {} });
        readHarness.get.mockRejectedValueOnce(readFailure);
        await expect(
            lastValueFrom(await readHarness.interceptor.intercept(readHarness.context, readHarness.next)),
        ).resolves.toBe('fresh');
        expect(readHarness.set).not.toHaveBeenCalled();

        const warnings = warn.mock.calls.flat().join(' ');
        expect(warnings).toContain('Cache key generation failed; bypassing cache');
        expect(warnings).toContain('Cache read failed; bypassing cache');
        expect(warnings).not.toContain('key-generation-secret');
        expect(warnings).not.toContain('password');
    });

    it('returns successful handler values on write failure unless strict mode is selected', async () => {
        const writeFailure = new Error('write unavailable');
        const fallback = createInterceptorHarness({}, { headers: {} });
        fallback.set.mockImplementationOnce(() => {
            throw writeFailure;
        });

        await expect(
            lastValueFrom(await fallback.interceptor.intercept(fallback.context, fallback.next)),
        ).resolves.toBe('fresh');

        const strict = createInterceptorHarness({ skipOnError: false }, { headers: {} });
        strict.set.mockRejectedValueOnce(writeFailure);
        await expect(lastValueFrom(await strict.interceptor.intercept(strict.context, strict.next))).rejects.toBe(
            writeFailure,
        );
    });

    it('preserves a strict Redis read error and never starts the handler', async () => {
        const readFailure = new Error('strict read unavailable');
        const harness = createInterceptorHarness({ skipOnError: false }, { headers: {} });
        harness.get.mockRejectedValueOnce(readFailure);

        await expect(harness.interceptor.intercept(harness.context, harness.next)).rejects.toBe(readFailure);
        expect(harness.next.handle).not.toHaveBeenCalled();
        expect(harness.set).not.toHaveBeenCalled();
    });

    it('preserves handler errors without attempting a cache write', async () => {
        const handlerError = new Error('handler failed');
        const harness = createInterceptorHarness(
            {},
            { headers: {} },
            throwError(() => handlerError),
        );

        await expect(lastValueFrom(await harness.interceptor.intercept(harness.context, harness.next))).rejects.toBe(
            handlerError,
        );
        expect(harness.set).not.toHaveBeenCalled();
    });

    it('does not emit a delayed cache-write result after the subscriber cancels', async () => {
        const write = deferred<void>();
        const teardown = jest.fn();
        const source = new Observable<string>(subscriber => {
            subscriber.next('fresh');
            return teardown;
        });
        const harness = createInterceptorHarness({}, { headers: {} }, source);
        harness.set.mockImplementationOnce(() => write.promise);
        const observer = { next: jest.fn(), error: jest.fn(), complete: jest.fn() };

        const stream = await harness.interceptor.intercept(harness.context, harness.next);
        const subscription = stream.subscribe(observer);
        await waitForMock(harness.set);
        subscription.unsubscribe();
        write.resolve();
        await new Promise<void>(resolve => setImmediate(resolve));

        expect(teardown).toHaveBeenCalledTimes(1);
        expect(observer.next).not.toHaveBeenCalled();
        expect(observer.error).not.toHaveBeenCalled();
        expect(observer.complete).not.toHaveBeenCalled();
    });

    it('passes through undecorated handlers and returns cached values without starting the handler', async () => {
        const plain = createInterceptorHarness({}, { headers: {} });
        Reflect.deleteMetadata(CACHE_KEY, plain.context.getHandler());
        await expect(lastValueFrom(await plain.interceptor.intercept(plain.context, plain.next))).resolves.toBe(
            'fresh',
        );

        const cached = createInterceptorHarness({}, { headers: {} });
        cached.get.mockResolvedValueOnce({ cached: true });
        await expect(lastValueFrom(await cached.interceptor.intercept(cached.context, cached.next))).resolves.toEqual({
            cached: true,
        });
        expect(cached.next.handle).not.toHaveBeenCalled();
    });

    it('does not write nullish handler values', async () => {
        for (const value of [null, undefined]) {
            const harness = createInterceptorHarness({}, { headers: {} }, of(value));
            await expect(
                lastValueFrom(await harness.interceptor.intercept(harness.context, harness.next)),
            ).resolves.toBe(value);
            expect(harness.set).not.toHaveBeenCalled();
        }
    });

    it('validates decorator configuration at declaration and metadata-read time', async () => {
        expect(() => Cache({ scope: 'shared' as never })).toThrow('scope');
        expect(() => Cache({ skipOnError: 'yes' as never })).toThrow('skipOnError');
        expect(() => Cache({ varyByHeaders: [' '] })).toThrow('header names');
        expect(() => Cache({ keyPrefix: ' ' })).toThrow('keyPrefix');

        const harness = createInterceptorHarness({} as CacheDecoratorOptions, { headers: {} });
        Reflect.defineMetadata(CACHE_KEY, { varyByHeaders: 'accept' }, harness.context.getHandler());
        await expect(harness.interceptor.intercept(harness.context, harness.next)).rejects.toThrow('must be an array');
    });

    it('bounds cache-key depth and size, bypassing safely unless strict mode is selected', async () => {
        let deeplyNested: Record<string, unknown> = {};
        for (let index = 0; index < 40; index += 1) deeplyNested = { child: deeplyNested };
        const fallback = createInterceptorHarness({}, { headers: {}, body: deeplyNested });
        await expect(
            lastValueFrom(await fallback.interceptor.intercept(fallback.context, fallback.next)),
        ).resolves.toBe('fresh');
        expect(fallback.get).not.toHaveBeenCalled();

        const strict = createInterceptorHarness(
            { skipOnError: false },
            { headers: {}, body: { value: 'x'.repeat(1_000_001) } },
        );
        await expect(strict.interceptor.intercept(strict.context, strict.next)).rejects.toThrow('too large');
    });

    it('canonicalizes supported structured key values and rejects unsupported symbols', async () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        const body = {
            boolean: true,
            numbers: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0],
            date: new Date('2024-01-01T00:00:00.000Z'),
            invalidDate: new Date(Number.NaN),
            regexp: /orders/giu,
            url: new URL('https://example.test/orders?q=1'),
            view: new Uint8Array([1, 2, 3]),
            buffer: new Uint8Array([4, 5]).buffer,
            map: new Map<unknown, unknown>([['one', 1]]),
            set: new Set<unknown>(['one', 2]),
            circular,
        };
        const first = await captureCacheKey({ method: 'POST', path: '/types', headers: {}, body });
        const second = await captureCacheKey({ method: 'POST', path: '/types', headers: {}, body });
        expect(second).toBe(first);

        const symbolBody = { value: 1, [Symbol('secret')]: 'hidden' };
        const strict = createInterceptorHarness({ skipOnError: false }, { headers: {}, body: symbolBody });
        await expect(strict.interceptor.intercept(strict.context, strict.next)).rejects.toThrow('symbol properties');

        const functionValue = createInterceptorHarness(
            { skipOnError: false },
            { headers: {}, body: { callback: () => undefined } },
        );
        await expect(functionValue.interceptor.intercept(functionValue.context, functionValue.next)).rejects.toThrow(
            'unsupported value',
        );
    });

    it('normalizes array headers and combines differently-cased duplicates', async () => {
        const key = await captureCacheKey(
            {
                method: 'GET',
                path: '/headers',
                headers: { Accept: ['application/json', 'text/plain'], accept: 'application/xml', ignored: undefined },
            },
            { varyByHeaders: [' ACCEPT '] },
        );
        expect(key).toMatch(/:v2:[a-f0-9]{64}$/);
    });

    it('rejects oversized and control-character key prefixes', () => {
        expect(() => Cache({ keyPrefix: 'x'.repeat(1_025) })).toThrow('cannot exceed');
        expect(() => Cache({ keyPrefix: 'bad\nprefix' })).toThrow('control characters');
    });
});

describe('TtlCache invalidation', () => {
    it('does not let a load finishing after clear replace a newer value', async () => {
        const oldLoad = deferred<number>();
        const cache = new TtlCache<number>(1_000);
        const loading = cache.getOrLoad('key', () => oldLoad.promise);
        await Promise.resolve();

        cache.clear();
        cache.set('key', 2);
        oldLoad.resolve(1);

        await expect(loading).resolves.toBe(1);
        expect(cache.get('key')).toBe(2);
    });

    it('caches undefined values for getOrLoad and validates construction bounds', async () => {
        const cache = new TtlCache<undefined>(1_000);
        cache.set('undefined', undefined);
        const factory = jest.fn(async () => undefined);

        await expect(cache.getOrLoad('undefined', factory)).resolves.toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
        expect(() => new TtlCache(0)).toThrow('ttlMs');
        expect(() => new TtlCache(1, 0)).toThrow('maxKeys');
    });

    it('evicts the oldest live key at capacity and refreshes replacement order', () => {
        const cache = new TtlCache<number>(1_000, 2);
        cache.set('one', 1);
        cache.set('two', 2);
        cache.set('one', 10);
        cache.set('three', 3);

        expect(cache.get('one')).toBe(10);
        expect(cache.get('two')).toBeUndefined();
        expect(cache.get('three')).toBe(3);
    });

    it('keeps a new load after deleting an older in-flight generation', async () => {
        const cache = new TtlCache<number>(1_000);
        const oldLoad = deferred<number>();
        const old = cache.getOrLoad('key', () => oldLoad.promise);
        await Promise.resolve();
        cache.delete('key');
        const fresh = cache.getOrLoad('key', async () => 2);
        await expect(fresh).resolves.toBe(2);
        oldLoad.resolve(1);
        await expect(old).resolves.toBe(1);
        expect(cache.get('key')).toBe(2);
    });
});

function createRedisHarness() {
    const get = jest.fn(async (): Promise<string | null> => null);
    const set = jest.fn(async (): Promise<void> => undefined);
    const expire = jest.fn(async (): Promise<boolean> => true);
    const deleteValue = jest.fn(async (): Promise<number> => 1);
    const redis = { get, set, expire, delete: deleteValue } as unknown as RedissonService;
    return { redis, get, set, expire, delete: deleteValue };
}

async function captureCacheKey(request: Record<string, unknown>, options: CacheDecoratorOptions = {}): Promise<string> {
    const harness = createInterceptorHarness(options, request);
    await lastValueFrom(await harness.interceptor.intercept(harness.context, harness.next));
    return harness.get.mock.calls[0]?.[0] as string;
}

function createInterceptorHarness(
    options: CacheDecoratorOptions,
    request: Record<string, unknown>,
    source: Observable<unknown> = of('fresh'),
) {
    const handler = () => undefined;
    class CacheController {}
    Reflect.defineMetadata(CACHE_KEY, options, handler);
    const get = jest.fn(async (): Promise<unknown> => null);
    const set = jest.fn(async (): Promise<void> => undefined);
    const cacheService = { get, set } as unknown as CacheService;
    const interceptor = new CacheInterceptor(cacheService, new Reflector());
    const context = {
        getHandler: () => handler,
        getClass: () => CacheController,
        switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    const next = { handle: jest.fn(() => source) };
    return { interceptor, context, next, get, set };
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(resolvePromise => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

async function waitForMock(mock: jest.Mock): Promise<void> {
    while (mock.mock.calls.length === 0) {
        await new Promise<void>(resolve => setImmediate(resolve));
    }
}
