import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EtcdService } from './etcd.service';

export type ConfigSubscriber = (value: unknown) => void;

/**
 * Distributed configuration service with hot-reload support
 */
@Injectable()
export class EtcdConfigService implements OnModuleInit {
    private readonly logger = new Logger(EtcdConfigService.name);
    private subscribers: Map<string, Set<ConfigSubscriber>> = new Map();
    private unsubscribers: Map<string, () => void> = new Map();
    private cache: Map<string, { value: unknown; timestamp: number }> = new Map();
    private cacheTtl = 5000;

    constructor(private readonly etcd: EtcdService) {}

    async onModuleInit() {
        this.logger.log('EtcdConfigService initialized');
    }

    // ==================== Get Configuration ====================

    async get<T = string>(key: string, useCache = true): Promise<T | null> {
        if (useCache) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
                return cached.value as T;
            }
        }

        const value = await this.etcd.get<T>(key);
        if (value !== null) {
            this.cache.set(key, { value, timestamp: Date.now() });
        }
        return value;
    }

    async getJSON<T = unknown>(key: string, useCache = true): Promise<T | null> {
        if (useCache) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
                return cached.value as T;
            }
        }

        const value = await this.etcd.getJSON<T>(key);
        if (value !== null) {
            this.cache.set(key, { value, timestamp: Date.now() });
        }
        return value;
    }

    async getByPrefix<T = unknown>(prefix: string): Promise<Map<string, T>> {
        return await this.etcd.getEntriesAsJSON<T>(prefix);
    }

    // ==================== Set Configuration ====================

    async set(key: string, value: string | number | boolean | object, options?: { ttl?: number }): Promise<void> {
        await this.etcd.set(key, value, options);
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    async setJSON<T extends object>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
        await this.set(key, value, options);
    }

    // ==================== Delete Configuration ====================

    async delete(key: string): Promise<boolean> {
        const result = await this.etcd.delete(key);
        this.cache.delete(key);
        return result;
    }

    async deleteByPrefix(prefix: string): Promise<number> {
        const count = await this.etcd.deleteByPrefix(prefix);
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
        return count;
    }

    // ==================== Hot Reload ====================

    subscribe<T = string>(key: string, callback: (value: T) => void): () => void {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());

            const unsubscribe = this.etcd.watch<T>(key, event => {
                const subs = this.subscribers.get(key);
                if (subs) {
                    if (event.value !== null) {
                        this.cache.set(key, { value: event.value, timestamp: Date.now() });
                        subs.forEach(cb => {
                            cb(event.value as T);
                        });
                    }
                }
            });

            this.unsubscribers.set(key, unsubscribe);
        }

        this.subscribers.get(key)!.add(callback as ConfigSubscriber);

        return () => {
            const subs = this.subscribers.get(key);
            if (subs) {
                subs.delete(callback as ConfigSubscriber);
                if (subs.size === 0) {
                    const unsub = this.unsubscribers.get(key);
                    if (unsub) {
                        unsub();
                        this.unsubscribers.delete(key);
                    }
                    this.subscribers.delete(key);
                }
            }
        };
    }

    subscribePrefix<T = string>(
        prefix: string,
        callback: (event: { key: string; value: T | null }) => void,
    ): () => void {
        const unsubscribe = this.etcd.watchPrefix<T>(prefix, event => {
            callback({ key: event.key, value: event.value });
        });

        return unsubscribe;
    }

    // ==================== Utility ====================

    async exists(key: string): Promise<boolean> {
        return await this.etcd.exists(key);
    }

    clearCache(): void {
        this.cache.clear();
    }

    setCacheTtl(ttl: number): void {
        this.cacheTtl = ttl;
    }
}
