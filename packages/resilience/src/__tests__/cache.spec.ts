import 'reflect-metadata';
import type { RedissonService } from '@a3s-lab/redisson';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import {
    CACHE_KEY,
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
