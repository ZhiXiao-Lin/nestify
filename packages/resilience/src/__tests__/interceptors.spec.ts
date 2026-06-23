import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
    CIRCUIT_BREAKER_OPTIONS,
    RETRY_OPTIONS,
    CircuitBreakerInterceptor,
    CircuitBreakerService,
    DistributedLockInterceptor,
    DistributedLockService,
    ResilienceModule,
    RetryInterceptor,
    RetryService,
} from '../index';

describe('resilience Nest integrations', () => {
    it('registers resilience services and global interceptors', () => {
        const module = ResilienceModule.register();

        expect(module.global).toBe(true);
        expect(module.providers).toEqual(
            expect.arrayContaining([
                RetryService,
                CircuitBreakerService,
                DistributedLockService,
                expect.objectContaining({ provide: expect.anything(), useClass: RetryInterceptor }),
                expect.objectContaining({ provide: expect.anything(), useClass: CircuitBreakerInterceptor }),
                expect.objectContaining({ provide: expect.anything(), useClass: DistributedLockInterceptor }),
            ]),
        );
        expect(module.exports).toEqual(expect.arrayContaining([RetryService, CircuitBreakerService]));
    });

    it('applies retry metadata through RetryInterceptor', async () => {
        const handler = () => undefined;
        Reflect.defineMetadata(RETRY_OPTIONS, { maxAttempts: 2, initialDelay: 0, maxDelay: 0 }, handler);
        const interceptor = new RetryInterceptor(new Reflector(), new RetryService());
        let attempts = 0;

        const result = await lastValueFrom(
            interceptor.intercept(createContext({ handler }), {
                handle: () => {
                    attempts += 1;
                    return attempts === 1 ? throwError(() => new Error('temporary')) : of('ok');
                },
            }),
        );

        expect(result).toBe('ok');
        expect(attempts).toBe(2);
    });

    it('applies circuit breaker metadata through CircuitBreakerInterceptor', async () => {
        const handler = () => undefined;
        Reflect.defineMetadata(CIRCUIT_BREAKER_OPTIONS, { name: 'checkout', failureThreshold: 1 }, handler);
        const service = new CircuitBreakerService();
        const interceptor = new CircuitBreakerInterceptor(new Reflector(), service);

        const result = await lastValueFrom(interceptor.intercept(createContext({ handler }), { handle: () => of(42) }));

        expect(result).toBe(42);
        expect(service.getAllStats()[0]).toMatchObject({ name: 'checkout', successes: 1 });
    });

    it('runs distributed lock interceptor handler inside the lock callback once', async () => {
        const lockService = {
            withLock: jest.fn(async (_key: string, callback: () => Promise<unknown>) => ({
                success: true,
                value: await callback(),
            })),
        } as unknown as DistributedLockService;
        const interceptor = new DistributedLockInterceptor(new Reflector(), lockService);
        const handler = () => undefined;
        Reflect.defineMetadata('resilience:distributed_lock', { key: 'order:{{params.id}}', prefix: 'api' }, handler);
        const next = { handle: jest.fn(() => of('locked')) };

        const result = await lastValueFrom(
            interceptor.intercept(createContext({ handler, request: { params: { id: 'ord-1' } } }), next),
        );

        expect(result).toBe('locked');
        expect(next.handle).toHaveBeenCalledTimes(1);
        expect(lockService.withLock).toHaveBeenCalledWith(
            'api:order:ord-1',
            expect.any(Function),
            expect.objectContaining({ waitTime: undefined, leaseTime: undefined }),
        );
    });
});

function createContext(options: { handler?: Function; targetClass?: Function; request?: Record<string, unknown> }) {
    const handler = options.handler ?? (() => undefined);
    const targetClass = options.targetClass ?? class TestController {};
    const request = options.request ?? {};

    return {
        getHandler: () => handler,
        getClass: () => targetClass,
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    } as never;
}
