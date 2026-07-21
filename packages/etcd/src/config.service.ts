import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { EtcdService } from './etcd.service';
import { ETCD_MODULE_OPTIONS, type EtcdModuleOptions } from './etcd.types';

export type ConfigSubscriber<T = unknown> = (value: T | null) => void | Promise<void>;

export interface ConfigPrefixEvent<T = unknown> {
    key: string;
    value: T | null;
}

export type ConfigPrefixSubscriber<T = unknown> = (event: ConfigPrefixEvent<T>) => void | Promise<void>;

type CacheKind = 'json' | 'raw';

interface CacheEntry {
    key: string;
    value: unknown;
    expiresAt: number;
}

/**
 * Distributed configuration service with bounded, coherent caching and shared hot-reload watches.
 */
@Injectable()
export class EtcdConfigService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EtcdConfigService.name);
    private readonly subscribers = new Map<string, Set<ConfigSubscriber>>();
    private readonly unsubscribers = new Map<string, () => void>();
    private readonly prefixSubscribers = new Map<string, Set<ConfigPrefixSubscriber>>();
    private readonly prefixUnsubscribers = new Map<string, () => void>();
    private readonly cache = new Map<string, CacheEntry>();
    private readonly inFlight = new Map<string, Promise<unknown | null>>();
    private cacheTtl: number;
    private cacheMaxEntries: number;
    private cacheMissing: boolean;
    private cacheEpoch = 0;
    private destroyed = false;

    constructor(
        private readonly etcd: EtcdService,
        @Optional() @Inject(ETCD_MODULE_OPTIONS) options?: EtcdModuleOptions,
    ) {
        this.cacheTtl = options?.configCache?.ttl ?? 5000;
        this.cacheMaxEntries = options?.configCache?.maxEntries ?? 1000;
        this.cacheMissing = options?.configCache?.cacheMissing ?? true;
        validateCacheTtl(this.cacheTtl);
        validateCacheMaxEntries(this.cacheMaxEntries);
    }

    onModuleInit(): void {
        this.logger.log('EtcdConfigService initialized');
    }

    onModuleDestroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;

        for (const [key, unsubscribe] of this.unsubscribers) {
            this.unsubscribeSafely(`key ${key}`, unsubscribe);
        }
        for (const [prefix, unsubscribe] of this.prefixUnsubscribers) {
            this.unsubscribeSafely(`prefix ${prefix}`, unsubscribe);
        }

        this.subscribers.clear();
        this.unsubscribers.clear();
        this.prefixSubscribers.clear();
        this.prefixUnsubscribers.clear();
        this.clearCache();
        this.inFlight.clear();
    }

    // ==================== Get Configuration ====================

    async get<T = string>(key: string, useCache = true): Promise<T | null> {
        return this.readThrough('raw', key, useCache, () => this.etcd.get<T>(key));
    }

    async getJSON<T = unknown>(key: string, useCache = true): Promise<T | null> {
        return this.readThrough('json', key, useCache, () => this.etcd.getJSON<T>(key));
    }

    async getByPrefix<T = unknown>(prefix: string): Promise<Map<string, T>> {
        return this.etcd.getEntriesAsJSON<T>(prefix);
    }

    // ==================== Set Configuration ====================

    async set(key: string, value: string | number | boolean | object, options?: { ttl?: number }): Promise<void> {
        await this.etcd.set(key, value, options);
        this.invalidateKey(key);
        this.cacheWrittenValue(key, value, options?.ttl);
    }

    async setJSON<T extends object>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
        await this.set(key, value, options);
    }

    // ==================== Delete Configuration ====================

    async delete(key: string): Promise<boolean> {
        const result = await this.etcd.delete(key);
        this.invalidateKey(key);
        return result;
    }

    async deleteByPrefix(prefix: string): Promise<number> {
        const count = await this.etcd.deleteByPrefix(prefix);
        this.invalidatePrefix(prefix);
        return count;
    }

    // ==================== Hot Reload ====================

    subscribe<T = string>(key: string, callback: ConfigSubscriber<T>): () => void {
        this.assertActive();
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
            const unsubscribe = this.etcd.watch<T>(key, event => {
                this.invalidateKey(event.key);
                if (event.value !== null) {
                    this.cacheWatchedValue(event.key, event.value);
                }
                const subscribers = this.subscribers.get(key);
                if (!subscribers) return;

                for (const subscriber of [...subscribers]) {
                    this.notifySubscriber(`key ${key}`, subscriber, event.value);
                }
            });
            this.unsubscribers.set(key, unsubscribe);
        }

        const subscriber = callback as ConfigSubscriber;
        this.subscribers.get(key)!.add(subscriber);

        let unsubscribed = false;
        return () => {
            if (unsubscribed) return;
            unsubscribed = true;
            const subscribers = this.subscribers.get(key);
            if (!subscribers) return;

            subscribers.delete(subscriber);
            if (subscribers.size > 0) return;

            const unsubscribe = this.unsubscribers.get(key);
            if (unsubscribe) {
                this.unsubscribeSafely(`key ${key}`, unsubscribe);
            }
            this.unsubscribers.delete(key);
            this.subscribers.delete(key);
        };
    }

    subscribePrefix<T = string>(prefix: string, callback: ConfigPrefixSubscriber<T>): () => void {
        this.assertActive();
        if (!this.prefixSubscribers.has(prefix)) {
            this.prefixSubscribers.set(prefix, new Set());
            const unsubscribe = this.etcd.watchPrefix<T>(prefix, event => {
                this.invalidateKey(event.key);
                if (event.value !== null) {
                    this.cacheWatchedValue(event.key, event.value);
                }
                const subscribers = this.prefixSubscribers.get(prefix);
                if (!subscribers) return;

                const change = { key: event.key, value: event.value };
                for (const subscriber of [...subscribers]) {
                    this.notifySubscriber(`prefix ${prefix}`, subscriber, change);
                }
            });
            this.prefixUnsubscribers.set(prefix, unsubscribe);
        }

        const subscriber = callback as ConfigPrefixSubscriber;
        this.prefixSubscribers.get(prefix)!.add(subscriber);

        let unsubscribed = false;
        return () => {
            if (unsubscribed) return;
            unsubscribed = true;
            const subscribers = this.prefixSubscribers.get(prefix);
            if (!subscribers) return;

            subscribers.delete(subscriber);
            if (subscribers.size > 0) return;

            const unsubscribe = this.prefixUnsubscribers.get(prefix);
            if (unsubscribe) {
                this.unsubscribeSafely(`prefix ${prefix}`, unsubscribe);
            }
            this.prefixUnsubscribers.delete(prefix);
            this.prefixSubscribers.delete(prefix);
        };
    }

    // ==================== Utility ====================

    async exists(key: string): Promise<boolean> {
        return this.etcd.exists(key);
    }

    clearCache(): void {
        this.cacheEpoch += 1;
        this.cache.clear();
    }

    setCacheTtl(ttl: number): void {
        validateCacheTtl(ttl);
        this.cacheTtl = ttl;
        this.clearCache();
    }

    setCacheMaxEntries(maxEntries: number): void {
        validateCacheMaxEntries(maxEntries);
        this.cacheMaxEntries = maxEntries;
        while (this.cache.size > maxEntries) {
            const oldest = this.cache.keys().next().value;
            if (oldest === undefined) break;
            this.cache.delete(oldest);
        }
    }

    setCacheMissing(cacheMissing: boolean): void {
        this.cacheMissing = cacheMissing;
        this.clearCache();
    }

    private async readThrough<T>(
        kind: CacheKind,
        key: string,
        useCache: boolean,
        load: () => Promise<T | null>,
    ): Promise<T | null> {
        if (!useCache || this.cacheTtl === 0 || this.cacheMaxEntries === 0) {
            return load();
        }

        const cacheKey = createCacheKey(kind, key);
        const cached = this.readCache(cacheKey);
        if (cached.hit) {
            return cached.value as T | null;
        }

        const pending = this.inFlight.get(cacheKey);
        if (pending) {
            return pending as Promise<T | null>;
        }

        const epoch = this.cacheEpoch;
        let request: Promise<T | null>;
        request = load()
            .then(value => {
                if (epoch === this.cacheEpoch && (value !== null || this.cacheMissing)) {
                    this.writeCache(kind, key, value);
                }
                return value;
            })
            .finally(() => {
                if (this.inFlight.get(cacheKey) === request) {
                    this.inFlight.delete(cacheKey);
                }
            });
        this.inFlight.set(cacheKey, request);
        return request;
    }

    private readCache(cacheKey: string): { hit: boolean; value?: unknown } {
        const entry = this.cache.get(cacheKey);
        if (!entry) return { hit: false };
        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(cacheKey);
            return { hit: false };
        }

        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, entry);
        return { hit: true, value: entry.value };
    }

    private writeCache(kind: CacheKind, key: string, value: unknown, ttlSeconds?: number): void {
        if (this.cacheTtl === 0 || this.cacheMaxEntries === 0) return;
        const lifetime = ttlSeconds === undefined ? this.cacheTtl : Math.min(this.cacheTtl, ttlSeconds * 1000);
        if (lifetime <= 0) return;

        const cacheKey = createCacheKey(kind, key);
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, { key, value, expiresAt: Date.now() + lifetime });
        while (this.cache.size > this.cacheMaxEntries) {
            const oldest = this.cache.keys().next().value;
            if (oldest === undefined) break;
            this.cache.delete(oldest);
        }
    }

    private invalidateKey(key: string): void {
        this.cacheEpoch += 1;
        this.cache.delete(createCacheKey('raw', key));
        this.cache.delete(createCacheKey('json', key));
    }

    private invalidatePrefix(prefix: string): void {
        this.cacheEpoch += 1;
        for (const [cacheKey, entry] of this.cache) {
            if (entry.key.startsWith(prefix)) {
                this.cache.delete(cacheKey);
            }
        }
    }

    private cacheWrittenValue(key: string, value: string | number | boolean | object, ttl?: number): void {
        const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
        this.writeCache('raw', key, serialized, ttl);
        this.cacheJsonValue(key, serialized, ttl);
    }

    private cacheWatchedValue(key: string, value: unknown): void {
        this.writeCache('raw', key, value);
        if (typeof value === 'string') {
            this.cacheJsonValue(key, value);
        }
    }

    private cacheJsonValue(key: string, serialized: string, ttl?: number): void {
        try {
            this.writeCache('json', key, JSON.parse(serialized), ttl);
        } catch {
            this.cache.delete(createCacheKey('json', key));
        }
    }

    private notifySubscriber<T>(label: string, callback: (value: T) => void | Promise<void>, value: T): void {
        try {
            void Promise.resolve(callback(value)).catch(error => {
                this.logger.error(`Configuration subscriber failed for ${label}`, error);
            });
        } catch (error) {
            this.logger.error(`Configuration subscriber failed for ${label}`, error);
        }
    }

    private unsubscribeSafely(label: string, unsubscribe: () => void): void {
        try {
            unsubscribe();
        } catch (error) {
            this.logger.error(`Failed to unsubscribe configuration watcher for ${label}`, error);
        }
    }

    private assertActive(): void {
        if (this.destroyed) {
            throw new Error('Cannot subscribe after EtcdConfigService shutdown has started');
        }
    }
}

function createCacheKey(kind: CacheKind, key: string): string {
    return `${kind}:${key}`;
}

function validateCacheTtl(ttl: number): void {
    if (!Number.isFinite(ttl) || ttl < 0) {
        throw new Error('Etcd configuration cache TTL must be a non-negative number');
    }
}

function validateCacheMaxEntries(maxEntries: number): void {
    if (!Number.isInteger(maxEntries) || maxEntries < 0) {
        throw new Error('Etcd configuration cache maxEntries must be a non-negative integer');
    }
}
