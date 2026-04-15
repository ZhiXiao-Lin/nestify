// ============================================================================
// Cache Interceptor - Automatically caches method results
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService, CacheDecoratorOptions } from './cache.service';
import { CACHE_KEY } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CacheInterceptor.name);

    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const cacheOptions = this.reflector.get<CacheDecoratorOptions>(
            CACHE_KEY,
            context.getHandler(),
        );

        // Skip if no cache options
        if (!cacheOptions) {
            return next.handle();
        }

        const cacheKey = this.buildCacheKey(context, cacheOptions);

        // Try to get from cache
        const cached = await this.cacheService.get(cacheKey, cacheOptions);
        if (cached !== null) {
            this.logger.debug(`Cache hit: ${cacheKey}`);
            return of(cached);
        }

        this.logger.debug(`Cache miss: ${cacheKey}`);

        // Execute handler and cache result
        return next.handle().pipe(
            tap(async (result) => {
                if (result !== undefined && result !== null) {
                    await this.cacheService.set(cacheKey, result, cacheOptions);
                    this.logger.debug(`Cached: ${cacheKey}`);
                }
            }),
        );
    }

    private buildCacheKey(context: ExecutionContext, options: CacheDecoratorOptions): string {
        const className = context.getClass().name;
        const methodName = context.getHandler().name;
        const prefix = options.keyPrefix ?? `${className}:${methodName}`;

        // Include route params in key if present
        const request = context.switchToHttp().getRequest();
        const params = request.params ? JSON.stringify(request.params) : '';

        return `${prefix}:${params}`;
    }
}
