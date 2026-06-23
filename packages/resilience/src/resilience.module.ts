import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheService } from './cache';
import { CircuitBreakerInterceptor, CircuitBreakerService } from './circuit-breaker';
import { DistributedLockInterceptor, DistributedLockService } from './distributed-lock';
import { RateLimitingGuard, RateLimitingService } from './rate-limiting';
import { RetryInterceptor, RetryService } from './retry';

@Module({})
export class ResilienceModule {
    static register(options: { globalInterceptors?: boolean } = { globalInterceptors: true }): DynamicModule {
        const interceptorProviders =
            options.globalInterceptors === false
                ? []
                : [
                      { provide: APP_INTERCEPTOR, useClass: RetryInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: DistributedLockInterceptor },
                  ];
        const providers = [
            RetryService,
            RetryInterceptor,
            CircuitBreakerService,
            CircuitBreakerInterceptor,
            CacheService,
            CacheInterceptor,
            RateLimitingService,
            RateLimitingGuard,
            DistributedLockService,
            DistributedLockInterceptor,
            ...interceptorProviders,
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
