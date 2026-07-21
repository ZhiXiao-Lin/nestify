import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheService } from './cache';
import { CircuitBreakerInterceptor, CircuitBreakerService } from './circuit-breaker';
import { DistributedLockInterceptor, DistributedLockService } from './distributed-lock';
import { RATE_LIMITING_OPTIONS, RateLimitingGuard, RateLimitingOptions, RateLimitingService } from './rate-limiting';
import { RetryInterceptor, RetryService } from './retry';

@Module({})
export class ResilienceModule {
    static register(
        options: {
            globalInterceptors?: boolean;
            globalRateLimitingGuard?: boolean;
            rateLimiting?: RateLimitingOptions;
        } = {},
    ): DynamicModule {
        const interceptorProviders =
            options.globalInterceptors === false
                ? []
                : [
                      { provide: APP_INTERCEPTOR, useClass: RetryInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: DistributedLockInterceptor },
                  ];
        const guardProviders =
            options.globalRateLimitingGuard === false ? [] : [{ provide: APP_GUARD, useExisting: RateLimitingGuard }];
        const providers = [
            RetryService,
            RetryInterceptor,
            CircuitBreakerService,
            CircuitBreakerInterceptor,
            CacheService,
            CacheInterceptor,
            { provide: RATE_LIMITING_OPTIONS, useValue: options.rateLimiting ?? {} },
            RateLimitingService,
            RateLimitingGuard,
            DistributedLockService,
            DistributedLockInterceptor,
            ...interceptorProviders,
            ...guardProviders,
        ];
        return {
            module: ResilienceModule,
            global: true,
            providers,
            exports: [
                RetryService,
                CircuitBreakerService,
                CacheService,
                RateLimitingService,
                RateLimitingGuard,
                DistributedLockService,
            ],
        };
    }
}
