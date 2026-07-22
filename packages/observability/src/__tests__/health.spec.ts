import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHealthCheck, HEALTH_CHECKS, HealthController, HealthModule, HealthProbeTimeoutError } from '../index';

describe('health checks', () => {
    it('returns an up result for successful sync and async probes', async () => {
        await expect(createHealthCheck('database', () => undefined)()).resolves.toEqual({
            database: { status: 'up' },
        });
        await expect(createHealthCheck('redis', async () => 'PONG')()).resolves.toEqual({ redis: { status: 'up' } });
    });

    it('hides underlying failures by default and exposes bounded details only by opt-in', async () => {
        const privateCheck = createHealthCheck('database', () => {
            throw new Error('password=super-secret');
        });
        await privateCheck().catch(error => {
            expect(error).toMatchObject({
                message: 'database check failed',
                causes: { database: { status: 'down', message: 'database check failed' } },
            });
        });

        const detailedCheck = createHealthCheck(
            'database',
            () => Promise.reject(new Error('connection\nrefused')),
            'Database unavailable',
            { exposeErrorDetails: true },
        );
        await detailedCheck().catch(error => {
            expect(error).toMatchObject({
                message: 'Database unavailable',
                causes: { database: { status: 'down', message: 'connection refused' } },
            });
        });

        const stringCheck = createHealthCheck('queue', () => Promise.reject('queue down'), undefined, {
            exposeErrorDetails: true,
        });
        await stringCheck().catch(error => {
            expect(error.causes.queue.message).toBe('queue down');
        });
        const unknownCheck = createHealthCheck('cache', () => Promise.reject({ private: true }), undefined, {
            exposeErrorDetails: true,
        });
        await unknownCheck().catch(error => {
            expect(error.causes.cache.message).toBe('Health check failed');
        });
    });

    it('bounds probe latency and aborts cooperative work on timeout', async () => {
        jest.useFakeTimers();
        let signal: AbortSignal | undefined;
        const check = createHealthCheck(
            'queue',
            currentSignal => {
                signal = currentSignal;
                return new Promise(() => undefined);
            },
            undefined,
            { timeoutMs: 25, exposeErrorDetails: true },
        );
        const result = check().catch(error => error as Error & { causes: Record<string, unknown> });
        await jest.advanceTimersByTimeAsync(25);
        const error = await result;
        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({
            causes: { queue: { status: 'down', message: 'Health check queue timed out after 25ms' } },
        });
        expect(signal?.aborted).toBe(true);
        jest.useRealTimers();
    });

    it('validates health check names, messages, probes, and options', () => {
        expect(() => createHealthCheck('../database', () => undefined)).toThrow(TypeError);
        expect(() => createHealthCheck('database', null as never)).toThrow(TypeError);
        expect(() => createHealthCheck('database', () => undefined, '')).toThrow(TypeError);
        expect(() => createHealthCheck('database', () => undefined, undefined, null as never)).toThrow(TypeError);
        expect(() => createHealthCheck('database', () => undefined, undefined, { timeoutMs: 0 })).toThrow(RangeError);
        expect(() => createHealthCheck('database', () => undefined, undefined, { timeoutMs: 300_001 })).toThrow(
            RangeError,
        );
        expect(() =>
            createHealthCheck('database', () => undefined, undefined, { exposeErrorDetails: 'yes' as never }),
        ).toThrow(TypeError);
        expect(new HealthProbeTimeoutError('database', 10)).toMatchObject({
            name: 'HealthProbeTimeoutError',
            checkName: 'database',
            timeoutMs: 10,
        });
    });

    it('uses imported module dependencies for health check factories', async () => {
        const dependencyToken = Symbol('DEPENDENCY');
        @Module({ providers: [{ provide: dependencyToken, useValue: 'ready' }], exports: [dependencyToken] })
        class DependencyModule {}

        const importedModule = HealthModule.register({
            imports: [DependencyModule],
            isGlobal: true,
            checks: [
                {
                    name: 'dependency',
                    inject: [dependencyToken],
                    useFactory: (value: string) => createHealthCheck('dependency', () => value),
                },
            ],
            liveStatus: { status: 'alive', nested: { version: 1 } },
        });
        expect(importedModule).toMatchObject({ global: true, imports: expect.arrayContaining([DependencyModule]) });

        const module = await Test.createTestingModule({ imports: [importedModule] }).compile();
        const checks = module.get<ReadonlyArray<() => Promise<unknown>>>(HEALTH_CHECKS);
        expect(Object.isFrozen(checks)).toBe(true);
        await expect(checks[0]()).resolves.toEqual({ dependency: { status: 'up' } });

        const controller = module.get(HealthController);
        const first = controller.live() as { nested: { version: number } };
        first.nested.version = 2;
        expect(controller.live()).toEqual({ status: 'alive', nested: { version: 1 } });
        await module.close();
    });

    it('rejects invalid or ambiguous module registration', () => {
        const check = { name: 'database', useFactory: () => createHealthCheck('database', () => undefined) };
        expect(() => HealthModule.register(null as never)).toThrow(TypeError);
        expect(() => HealthModule.register({ imports: null as never })).toThrow(TypeError);
        expect(() => HealthModule.register({ checks: null as never })).toThrow(TypeError);
        expect(() => HealthModule.register({ checks: [null as never] })).toThrow(TypeError);
        expect(() => HealthModule.register({ checks: [check, check] })).toThrow('duplicate health check name');
        expect(() => HealthModule.register({ checks: [{ ...check, useFactory: null as never }] })).toThrow(TypeError);
        expect(() => HealthModule.register({ checks: [{ ...check, inject: null as never }] })).toThrow(TypeError);
        expect(() => HealthModule.register({ liveStatus: [] as never })).toThrow(TypeError);
        expect(() => HealthModule.register({ isGlobal: 'yes' as never })).toThrow(TypeError);
        expect(() =>
            HealthModule.register({
                checks: Array.from({ length: 101 }, (_, index) => ({
                    name: `check-${index}`,
                    useFactory: () => createHealthCheck(`check-${index}`, () => undefined),
                })),
            }),
        ).toThrow(RangeError);
        expect(HealthModule.register()).toMatchObject({ module: HealthModule, global: false });
    });

    it('fails module startup when a registered factory does not return a check function', async () => {
        await expect(
            Test.createTestingModule({
                imports: [
                    HealthModule.register({
                        checks: [{ name: 'invalid', useFactory: () => null as never }],
                    }),
                ],
            }).compile(),
        ).rejects.toThrow('factory must return a function');
    });

    it('sanitizes liveness arrays, non-finite values, accessors, and unsupported values', async () => {
        const getter = jest.fn(() => 'private');
        let deep: Record<string, unknown> = { value: 'deep' };
        for (let index = 0; index < 10; index += 1) deep = { nested: deep };
        const liveStatus: Record<string, unknown> = {
            values: [true, 'ready'],
            load: Number.POSITIVE_INFINITY,
            unsupported: Symbol('private'),
            deep,
        };
        Object.defineProperty(liveStatus, 'computed', { enumerable: true, get: getter });
        const module = await Test.createTestingModule({
            imports: [HealthModule.register({ liveStatus })],
        }).compile();
        const result = module.get(HealthController).live();
        expect(result).toMatchObject({
            values: [true, 'ready'],
            load: null,
            unsupported: '<unsupported>',
            computed: '<accessor>',
        });
        expect(JSON.stringify(result)).toContain('<truncated>');
        expect(getter).not.toHaveBeenCalled();
        await module.close();
    });

    it('delegates readiness and liveness through defensive results', async () => {
        const check = createHealthCheck('database', () => undefined);
        const health = { check: jest.fn(async () => ({ status: 'ok', info: {}, error: {}, details: {} })) };
        const controller = new HealthController(health as never, [check], { status: 'alive' });
        await expect(controller.check()).resolves.toMatchObject({ status: 'ok' });
        await expect(controller.ready()).resolves.toMatchObject({ status: 'ok' });
        expect(controller.live()).toEqual({ status: 'alive' });
        expect(health.check).toHaveBeenCalledTimes(2);
    });
});
