import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    OnModuleDestroy,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedissonService } from '@a3s-lab/redisson';
import type { Request } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CacheOptions {
    ttl?: number;
    prefix?: string;
    touch?: boolean;
}

export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
}

export interface CacheDecoratorOptions extends CacheOptions {
    keyPrefix?: string;
    skipOnError?: boolean;
}

const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
    ttl: 300,
    prefix: 'cache',
    touch: false,
};

@Injectable()
export class CacheService implements OnModuleDestroy {
    private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

    constructor(private readonly redis: RedissonService) {}

    async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const fullKey = this.buildKey(key, options);
        const data = await this.redis.get(fullKey);
        if (!data) {
            this.stats.misses += 1;
            return null;
        }
        this.stats.hits += 1;
        if (options?.touch) {
            await this.redis.expire(fullKey, options.ttl ?? DEFAULT_CACHE_OPTIONS.ttl);
        }
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as T;
        }
    }

    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
        await this.redis.set(
            this.buildKey(key, options),
            typeof value === 'string' ? value : JSON.stringify(value),
            ttl,
        );
        this.stats.sets += 1;
    }

    async delete(key: string, options?: CacheOptions): Promise<void> {
        await this.redis.delete(this.buildKey(key, options));
        this.stats.deletes += 1;
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        const cached = await this.get<T>(key, options);
        if (cached !== null) return cached;
        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return { ...this.stats, hitRate: total > 0 ? this.stats.hits / total : 0 };
    }

    resetStats(): void {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    onModuleDestroy(): void {
        this.resetStats();
    }

    private buildKey(key: string, options?: CacheOptions): string {
        return `cache:${options?.prefix ?? DEFAULT_CACHE_OPTIONS.prefix}:${key}`;
    }
}

export const CACHE_KEY = 'resilience:cache_options';
export const Cache = (options: CacheDecoratorOptions) => SetMetadata(CACHE_KEY, options);
export const CachePrefix = (prefix: string) => SetMetadata(CACHE_KEY, { prefix });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const cacheOptions = this.reflector.getAllAndOverride<CacheDecoratorOptions | undefined>(CACHE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!cacheOptions) return next.handle();

        const cacheKey = this.buildCacheKey(context, cacheOptions);
        const cached = await this.cacheService.get(cacheKey, cacheOptions);
        if (cached !== null) return of(cached);

        return next.handle().pipe(
            tap(async result => {
                if (result !== undefined && result !== null) {
                    await this.cacheService.set(cacheKey, result, cacheOptions);
                }
            }),
        );
    }

    private buildCacheKey(context: ExecutionContext, options: CacheDecoratorOptions): string {
        const request = context.switchToHttp().getRequest<Request>();
        const prefix = options.keyPrefix ?? `${context.getClass().name}:${context.getHandler().name}`;
        return `${prefix}:${JSON.stringify(request.params ?? {})}`;
    }
}

export class TtlCache<T> {
    private readonly store = new Map<string, { at: number; value: T }>();
    private readonly inflight = new Map<string, Promise<T>>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxKeys = 256,
    ) {}

    get(key: string): T | undefined {
        const hit = this.store.get(key);
        if (!hit) return undefined;
        if (Date.now() - hit.at >= this.ttlMs) {
            this.store.delete(key);
            return undefined;
        }
        return hit.value;
    }

    set(key: string, value: T): void {
        this.store.set(key, { at: Date.now(), value });
        if (this.store.size > this.maxKeys) {
            const oldest = [...this.store.entries()].sort((left, right) => left[1].at - right[1].at)[0]?.[0];
            if (oldest) this.store.delete(oldest);
        }
    }

    async getOrLoad(key: string, factory: () => Promise<T>): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) return cached;
        const pending = this.inflight.get(key);
        if (pending) return pending;
        const promise = factory()
            .then(value => {
                this.set(key, value);
                return value;
            })
            .finally(() => this.inflight.delete(key));
        this.inflight.set(key, promise);
        return promise;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
        this.inflight.clear();
    }
}
