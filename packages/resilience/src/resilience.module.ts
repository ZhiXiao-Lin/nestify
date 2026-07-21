import { type DynamicModule, Module, type ModuleMetadata } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheService } from './cache';
import { CircuitBreakerInterceptor, CircuitBreakerService } from './circuit-breaker';
import { DistributedLockInterceptor, DistributedLockService } from './distributed-lock';
import { RATE_LIMITING_OPTIONS, RateLimitingGuard, RateLimitingOptions, RateLimitingService } from './rate-limiting';
import { RetryInterceptor, RetryService } from './retry';

@Module({})
export class ResilienceModule {
    static register(options: ResilienceModuleOptions = {}): DynamicModule {
        validateModuleOptions(options);
        const redisBackedFeatures = options.redisBackedFeatures ?? true;
        const interceptorProviders =
            options.globalInterceptors === false
                ? []
                : [
                      { provide: APP_INTERCEPTOR, useClass: RetryInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
                      ...(redisBackedFeatures
                          ? [
                                { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
                                { provide: APP_INTERCEPTOR, useClass: DistributedLockInterceptor },
                            ]
                          : []),
                  ];
        const guardProviders =
            !redisBackedFeatures || options.globalRateLimitingGuard === false
                ? []
                : [{ provide: APP_GUARD, useExisting: RateLimitingGuard }];
        const redisProviders = redisBackedFeatures
            ? [
                  CacheService,
                  CacheInterceptor,
                  { provide: RATE_LIMITING_OPTIONS, useValue: Object.freeze({ ...(options.rateLimiting ?? {}) }) },
                  RateLimitingService,
                  RateLimitingGuard,
                  DistributedLockService,
                  DistributedLockInterceptor,
              ]
            : [];
        const providers = [
            RetryService,
            RetryInterceptor,
            CircuitBreakerService,
            CircuitBreakerInterceptor,
            ...redisProviders,
            ...interceptorProviders,
            ...guardProviders,
        ];
        return {
            module: ResilienceModule,
            global: options.isGlobal ?? true,
            imports: [...(options.imports ?? [])],
            providers,
            exports: [
                RetryService,
                CircuitBreakerService,
                ...(redisBackedFeatures
                    ? [CacheService, RateLimitingService, RateLimitingGuard, DistributedLockService]
                    : []),
            ],
        };
    }
}

export interface ResilienceModuleOptions {
    /** Modules that provide `RedissonService` or other dependencies used by resilience providers. */
    imports?: ModuleMetadata['imports'];
    /** Whether this module is global. Defaults to true for backwards compatibility. */
    isGlobal?: boolean;
    /** Install retry/circuit and, when enabled, cache/lock interceptors globally. Defaults to true. */
    globalInterceptors?: boolean;
    /** Install the metadata-driven rate-limit guard globally. Defaults to true. */
    globalRateLimitingGuard?: boolean;
    /** Register cache, rate-limit, and distributed-lock providers. Defaults to true. */
    redisBackedFeatures?: boolean;
    rateLimiting?: RateLimitingOptions;
}

function validateModuleOptions(options: ResilienceModuleOptions): void {
    if (!options || typeof options !== 'object') throw new TypeError('ResilienceModule options must be an object');
    for (const key of ['isGlobal', 'globalInterceptors', 'globalRateLimitingGuard', 'redisBackedFeatures'] as const) {
        if (options[key] !== undefined && typeof options[key] !== 'boolean') {
            throw new TypeError(`${key} must be a boolean`);
        }
    }
    if (options.imports !== undefined && !Array.isArray(options.imports)) {
        throw new TypeError('ResilienceModule imports must be an array');
    }
    if (options.redisBackedFeatures === false && options.rateLimiting !== undefined) {
        throw new TypeError('rateLimiting options require redisBackedFeatures');
    }
}
