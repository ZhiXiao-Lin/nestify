import 'reflect-metadata';
import { RedissonService } from '@a3s-lab/redisson';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CacheService } from '../cache';
import { CircuitBreakerService } from '../circuit-breaker';
import { DistributedLockService } from '../distributed-lock';
import { RateLimitingGuard, RateLimitingService } from '../rate-limiting';
import { ResilienceModule } from '../resilience.module';
import { RetryService } from '../retry';

const redisValue = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    expire: jest.fn(async () => true),
    delete: jest.fn(async () => 0),
    redis: { eval: jest.fn(async () => [1, Date.now(), 1]) },
    getLock: jest.fn(() => ({ tryLock: jest.fn(async () => true), unlock: jest.fn(async () => undefined) })),
};

@Module({
    providers: [{ provide: RedissonService, useValue: redisValue }],
    exports: [RedissonService],
})
class TestRedisModule {}

describe('ResilienceModule', () => {
    it('imports the module that owns Redisson so every Redis-backed provider resolves', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ResilienceModule.register({
                    imports: [TestRedisModule],
                    globalInterceptors: false,
                    globalRateLimitingGuard: false,
                    isGlobal: false,
                }),
            ],
        }).compile();

        expect(moduleRef.get(RetryService)).toBeInstanceOf(RetryService);
        expect(moduleRef.get(CircuitBreakerService)).toBeInstanceOf(CircuitBreakerService);
        expect(moduleRef.get(CacheService)).toBeInstanceOf(CacheService);
        expect(moduleRef.get(RateLimitingService)).toBeInstanceOf(RateLimitingService);
        expect(moduleRef.get(RateLimitingGuard)).toBeInstanceOf(RateLimitingGuard);
        expect(moduleRef.get(DistributedLockService)).toBeInstanceOf(DistributedLockService);
        await moduleRef.close();
    });

    it('can register retry and circuit breaking without a Redis dependency', async () => {
        const dynamicModule = ResilienceModule.register({ redisBackedFeatures: false, isGlobal: false });

        expect(dynamicModule.global).toBe(false);
        expect(dynamicModule.providers).toEqual(expect.arrayContaining([RetryService, CircuitBreakerService]));
        expect(dynamicModule.providers).not.toEqual(expect.arrayContaining([CacheService, RateLimitingService]));
        expect(dynamicModule.exports).toEqual([RetryService, CircuitBreakerService]);

        const moduleRef = await Test.createTestingModule({ imports: [dynamicModule] }).compile();
        expect(moduleRef.get(RetryService)).toBeInstanceOf(RetryService);
        expect(() => moduleRef.get(CacheService)).toThrow();
        await moduleRef.close();
    });

    it('supports explicit global-provider opt-outs', () => {
        const dynamicModule = ResilienceModule.register({
            imports: [TestRedisModule],
            globalInterceptors: false,
            globalRateLimitingGuard: false,
        });
        const providers = dynamicModule.providers ?? [];

        expect(dynamicModule.imports).toEqual([TestRedisModule]);
        expect(providers).not.toEqual(expect.arrayContaining([expect.objectContaining({ provide: APP_INTERCEPTOR })]));
        expect(providers).not.toEqual(expect.arrayContaining([expect.objectContaining({ provide: APP_GUARD })]));
    });

    it.each([
        [null, 'options'],
        [{ isGlobal: 'yes' }, 'isGlobal'],
        [{ globalInterceptors: 1 }, 'globalInterceptors'],
        [{ globalRateLimitingGuard: 'yes' }, 'globalRateLimitingGuard'],
        [{ redisBackedFeatures: 'yes' }, 'redisBackedFeatures'],
        [{ imports: TestRedisModule }, 'imports'],
        [{ redisBackedFeatures: false, rateLimiting: {} }, 'require redisBackedFeatures'],
    ] as Array<
        [Record<string, unknown> | null, string]
    >)('rejects invalid registration options %#', (options, message) => {
        expect(() => ResilienceModule.register(options as never)).toThrow(message);
    });
});
