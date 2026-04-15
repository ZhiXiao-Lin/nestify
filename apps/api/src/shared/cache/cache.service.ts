// ============================================================================
// Cache Service - Redis-based caching abstraction
// ============================================================================

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

export interface CacheOptions {
    /** Time to live in seconds */
    ttl?: number;
    /** Namespace prefix */
    prefix?: string;
    /** Whether to refresh TTL on access */
    touch?: boolean;
}

export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
}

/**
 * Decorator options for caching (extends CacheOptions)
 */
export interface CacheDecoratorOptions extends CacheOptions {
    /** Key prefix for the cached method */
    keyPrefix?: string;
    /** Whether to skip cache on error */
    skipOnError?: boolean;
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
    ttl: 300, // 5 minutes
    prefix: 'cache',
    touch: false,
};

/**
 * Cache Service - provides Redis-based caching with stats tracking
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly keyPrefix = 'cache:';
    private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

    constructor(private readonly redis: RedissonService) {}

    /**
     * Get a value from cache
     */
    async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const fullKey = this.buildKey(key, options);
        const data = await this.redis.get(fullKey);

        if (data) {
            this.stats.hits++;
            // Optionally refresh TTL on access
            if (options?.touch) {
                const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
                await this.redis.expire(fullKey, ttl);
            }
            try {
                return JSON.parse(data) as T;
            } catch {
                return data as unknown as T;
            }
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const fullKey = this.buildKey(key, options);
        const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);

        await this.redis.set(fullKey, serialized, ttl);
        this.stats.sets++;
    }

    /**
     * Delete a key from cache
     */
    async delete(key: string, options?: CacheOptions): Promise<void> {
        const fullKey = this.buildKey(key, options);
        await this.redis.delete(fullKey);
        this.stats.deletes++;
    }

    /**
     * Delete all keys matching a pattern
     */
    async deleteByPattern(pattern: string): Promise<number> {
        const fullPattern = `${this.keyPrefix}${pattern}`;
        const count = await this.redis.deleteByPattern(fullPattern);
        this.stats.deletes += count;
        return count;
    }

    /**
     * Check if a key exists
     */
    async has(key: string, options?: CacheOptions): Promise<boolean> {
        const fullKey = this.buildKey(key, options);
        return this.redis.exists(fullKey);
    }

    /**
     * Get or set - fetch from cache or execute factory and cache the result
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        options?: CacheOptions,
    ): Promise<T> {
        const cached = await this.get<T>(key, options);
        if (cached !== null) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    /**
     * Get multiple values from cache
     */
    async getMany<T>(keys: string[], options?: CacheOptions): Promise<Array<T | null>> {
        const promises = keys.map(key => this.get<T>(key, options));
        return Promise.all(promises);
    }

    /**
     * Set multiple values in cache
     */
    async setMany<T>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<void> {
        const promises = entries.map(({ key, value }) => this.set(key, value, options));
        await Promise.all(promises);
    }

    /**
     * Increment a counter in cache
     */
    async increment(key: string, amount = 1, options?: CacheOptions): Promise<number> {
        const fullKey = this.buildKey(key, options);
        const value = await this.redis.increment(fullKey, amount);
        // Set TTL if not exists
        const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
        await this.redis.expire(fullKey, ttl);
        return value;
    }

    /**
     * Decrement a counter in cache
     */
    async decrement(key: string, amount = 1, options?: CacheOptions): Promise<number> {
        const fullKey = this.buildKey(key, options);
        const value = await this.redis.decrement(fullKey, amount);
        return value;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }

    /**
     * Reset cache statistics
     */
    resetStats(): void {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    /**
     * Build full cache key
     */
    private buildKey(key: string, options?: CacheOptions): string {
        const prefix = options?.prefix ?? 'cache';
        return `${this.keyPrefix}${prefix}:${key}`;
    }

    onModuleDestroy(): void {
        this.logger.log('Cache service destroyed');
    }
}
