import 'reflect-metadata';
import type { RedissonService } from '@a3s-lab/redisson';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
    DISTRIBUTED_LOCK_KEY,
    DistributedLockAcquisitionError,
    DistributedLockCleanupError,
    DistributedLockInterceptor,
    DistributedLockReleaseError,
    DistributedLockService,
} from '../distributed-lock';

describe('DistributedLockService', () => {
    let logError: jest.SpyInstance;

    beforeEach(() => {
        logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        logError.mockRestore();
    });

    it('executes under a lease and directly performs the ownership-safe unlock', async () => {
        const harness = createLockHarness();
        const service = new DistributedLockService(harness.redisson);
        const callback = jest.fn(async () => 'value');

        await expect(service.withLock('orders:one', callback, { waitTime: 10, leaseTime: 20 })).resolves.toEqual({
            success: true,
            value: 'value',
        });
        expect(harness.getLock).toHaveBeenCalledWith('lock:orders:one');
        expect(harness.tryLock).toHaveBeenCalledWith(10, 20);
        expect(harness.unlock).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('uses watchdog renewal explicitly and reports a non-acquired lock', async () => {
        const harness = createLockHarness();
        harness.tryLock.mockResolvedValueOnce(false);
        const callback = jest.fn(async () => 'never');

        const result = await new DistributedLockService(harness.redisson).withLock('orders:one', callback, {
            watchdog: true,
        });

        expect(result).toEqual({ success: false, error: expect.any(DistributedLockAcquisitionError) });
        expect(harness.tryLock).toHaveBeenCalledWith(5_000, true);
        expect(callback).not.toHaveBeenCalled();
        expect(harness.unlock).not.toHaveBeenCalled();
    });

    it('wraps lock-client acquisition failures without leaking their details to logs', async () => {
        const harness = createLockHarness();
        const backendFailure = new Error('redis://user:secret@internal');
        harness.tryLock.mockRejectedValueOnce(backendFailure);

        const result = await new DistributedLockService(harness.redisson).withLock('orders:one', async () => 'never');

        expect(result).toMatchObject({
            success: false,
            error: { name: 'DistributedLockAcquisitionError', cause: backendFailure },
        });
        expect(logError.mock.calls.flat().join(' ')).not.toContain('secret');

        const nonErrorHarness = createLockHarness();
        nonErrorHarness.getLock.mockImplementationOnce(() => {
            throw 'client unavailable';
        });
        await expect(
            new DistributedLockService(nonErrorHarness.redisson).withLock('orders:two', async () => 'never'),
        ).resolves.toMatchObject({ success: false, error: { cause: { message: 'client unavailable' } } });
    });

    it('returns callback failures after releasing the lock and normalizes non-Error values', async () => {
        const harness = createLockHarness();
        const callbackFailure = new Error('operation failed');
        const service = new DistributedLockService(harness.redisson);

        await expect(
            service.withLock('orders:one', async () => {
                throw callbackFailure;
            }),
        ).resolves.toEqual({ success: false, error: callbackFailure });
        await expect(service.withLock('orders:two', async () => Promise.reject('offline'))).resolves.toMatchObject({
            success: false,
            error: { message: 'offline' },
        });
        expect(harness.unlock).toHaveBeenCalledTimes(2);
    });

    it('surfaces release failure after success and preserves both failures after callback failure', async () => {
        const harness = createLockHarness();
        const releaseFailure = new Error('unlock unavailable');
        harness.unlock.mockRejectedValueOnce(releaseFailure);
        const service = new DistributedLockService(harness.redisson);

        await expect(service.withLock('orders:one', async () => 'value')).resolves.toMatchObject({
            success: false,
            error: { name: 'DistributedLockReleaseError', cause: releaseFailure },
        });

        const callbackFailure = new Error('callback failed');
        harness.unlock.mockRejectedValueOnce(releaseFailure);
        const result = await service.withLock('orders:two', async () => {
            throw callbackFailure;
        });
        expect(result).toMatchObject({ success: false, error: expect.any(DistributedLockCleanupError) });
        const aggregate = (result as { success: false; error: DistributedLockCleanupError }).error;
        expect(aggregate.errors).toEqual([callbackFailure, expect.any(DistributedLockReleaseError)]);
        expect(aggregate.operationError).toBe(callbackFailure);
    });

    it.each([
        ['', {}, 'key must not be empty'],
        ['bad\nkey', {}, 'control characters'],
        ['bad{slot}', {}, 'braces'],
        ['x'.repeat(1_025), {}, 'cannot exceed'],
        ['valid', { waitTime: -1 }, 'waitTime'],
        ['valid', { leaseTime: 0 }, 'leaseTime'],
        ['valid', { watchdog: 'yes' }, 'watchdog'],
        ['valid', null, 'options'],
    ] as Array<
        [string, Record<string, unknown> | null, string]
    >)('validates lock input %#', async (key, options, message) => {
        await expect(
            new DistributedLockService(createLockHarness().redisson).withLock(
                key,
                async () => 'value',
                options as never,
            ),
        ).rejects.toThrow(message);
    });

    it('rejects a missing callback', async () => {
        await expect(
            new DistributedLockService(createLockHarness().redisson).withLock('valid', undefined as never),
        ).rejects.toThrow('callback must be a function');
    });
});

describe('DistributedLockInterceptor', () => {
    it('hashes request-derived values while preserving deterministic coordination', async () => {
        const withLock = jest.fn(async (_key: string, callback: () => Promise<unknown>) => ({
            success: true as const,
            value: await callback(),
        }));
        const interceptor = new DistributedLockInterceptor(new Reflector(), {
            withLock,
        } as unknown as DistributedLockService);
        const handler = () => undefined;
        Reflect.defineMetadata(
            DISTRIBUTED_LOCK_KEY,
            { key: 'order:{{params.id}}:{{query.version}}', prefix: 'api' },
            handler,
        );
        const context = createContext(handler, { params: { id: 'ord-1' }, query: { version: 2 } });

        await expect(lastValueFrom(interceptor.intercept(context, { handle: () => of('locked') }))).resolves.toBe(
            'locked',
        );
        const key = withLock.mock.calls[0]?.[0] as string;
        expect(key).toMatch(/^api:order:[a-f0-9]{64}:[a-f0-9]{64}$/);
        expect(key).not.toContain('ord-1');
    });

    it.each([
        [{ key: 'order:{{params.id}}' }, { params: {} }, 'is missing'],
        [{ key: 'order:{{params.id}}' }, { params: { id: {} } }, 'must be primitive'],
        [{ key: 'order:{{headers.id}}' }, {}, 'unsupported template'],
        [{ key: 'order', prefix: 'bad prefix' }, {}, 'unsupported characters'],
        [{ key: '' }, {}, 'must not be empty'],
        [{ key: 'x'.repeat(1_025) }, {}, 'template cannot exceed'],
        [{ key: 'order:{{params.id}}' }, { params: { id: Number.NaN } }, 'must be finite'],
        [{ key: 'order:{{params.id}}' }, { params: { id: 'x'.repeat(4_097) } }, 'cannot exceed'],
    ])('rejects unsafe template case %#', (options, request, message) => {
        const handler = () => undefined;
        Reflect.defineMetadata(DISTRIBUTED_LOCK_KEY, options, handler);
        const interceptor = new DistributedLockInterceptor(new Reflector(), {
            withLock: jest.fn(),
        } as unknown as DistributedLockService);

        expect(() => interceptor.intercept(createContext(handler, request), { handle: () => of('value') })).toThrow(
            message,
        );
    });

    it('passes through undecorated handlers and emits lock errors without running the handler', async () => {
        const plain = new DistributedLockInterceptor(new Reflector(), {} as DistributedLockService);
        const next = { handle: jest.fn(() => of('plain')) };
        await expect(
            lastValueFrom(
                plain.intercept(
                    createContext(() => undefined, {}),
                    next,
                ),
            ),
        ).resolves.toBe('plain');

        const handler = () => undefined;
        Reflect.defineMetadata(DISTRIBUTED_LOCK_KEY, { key: 'orders' }, handler);
        const failure = new DistributedLockAcquisitionError('lock:orders');
        const interceptor = new DistributedLockInterceptor(new Reflector(), {
            withLock: jest.fn(async () => ({ success: false, error: failure })),
        } as unknown as DistributedLockService);
        const lockedNext = { handle: jest.fn(() => throwError(() => new Error('must not run'))) };

        await expect(lastValueFrom(interceptor.intercept(createContext(handler, {}), lockedNext))).rejects.toBe(
            failure,
        );
        expect(lockedNext.handle).not.toHaveBeenCalled();
    });

    it('rejects accessor-backed template values without invoking the accessor', () => {
        const getter = jest.fn(() => 'secret');
        const params = Object.defineProperty({}, 'id', { enumerable: true, get: getter });
        const handler = () => undefined;
        Reflect.defineMetadata(DISTRIBUTED_LOCK_KEY, { key: 'order:{{params.id}}' }, handler);
        const interceptor = new DistributedLockInterceptor(new Reflector(), {
            withLock: jest.fn(),
        } as unknown as DistributedLockService);

        expect(() => interceptor.intercept(createContext(handler, { params }), { handle: () => of('value') })).toThrow(
            'is missing',
        );
        expect(getter).not.toHaveBeenCalled();
    });
});

function createLockHarness() {
    const tryLock = jest.fn(async () => true);
    const unlock = jest.fn(async () => undefined);
    const getLock = jest.fn(() => ({ tryLock, unlock }));
    return { redisson: { getLock } as unknown as RedissonService, getLock, tryLock, unlock };
}

function createContext(handler: Function, request: Record<string, unknown>) {
    return {
        getHandler: () => handler,
        getClass: () => class LockController {},
        switchToHttp: () => ({ getRequest: () => request }),
    } as never;
}
