import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Etcd3, EtcdOptions } from 'etcd3';
import type { EtcdModuleOptions, WatchEvent, WatchCallback, ConfigEntry, LeaseInfo, HealthResult } from './etcd.types';

@Injectable()
export class EtcdService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EtcdService.name);
    private client: Etcd3;
    private watchers: Map<string, ReturnType<Etcd3['watch']>> = new Map();

    constructor(private readonly options: EtcdModuleOptions) {
        const etcdOptions: EtcdOptions = {
            hosts: this.options.endpoints,
            credentials: this.options.tls
                ? {
                      cert: this.options.tls.cert,
                      key: this.options.tls.key,
                      ca: this.options.tls.ca,
                  }
                : undefined,
            username: this.options.auth?.username,
            password: this.options.auth?.password,
        };

        this.client = new Etcd3(etcdOptions);
    }

    async onModuleInit() {
        try {
            const health = await this.healthCheck();
            if (health.healthy) {
                this.logger.log(`Successfully connected to etcd: ${this.options.endpoints.join(', ')}`);
            } else {
                throw new Error('Etcd health check failed');
            }
        } catch (error) {
            this.logger.error('Failed to connect to etcd', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            for (const [key, watcher] of this.watchers) {
                this.logger.debug(`Canceling watcher: ${key}`);
                watcher.cancel();
            }
            this.watchers.clear();
            await this.client.close();
            this.logger.log('Etcd connection closed');
        } catch (error) {
            this.logger.error('Error closing etcd connection', error);
        }
    }

    // ==================== Key-Value Operations ====================

    async get<T = string>(key: string): Promise<T | null> {
        try {
            return (await this.client.get(key).string()) as T;
        } catch (error: unknown) {
            if ((error as { code?: string })?.code === 'KEY_NOT_FOUND') {
                return null;
            }
            throw error;
        }
    }

    async getJSON<T = unknown>(key: string): Promise<T | null> {
        const value = await this.get<string>(key);
        if (!value) return null;
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    async set(key: string, value: string | number | boolean | object, options?: { ttl?: number; lease?: string }): Promise<void> {
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        if (options?.ttl && !options?.lease) {
            await this.client.put(key).value(value as string).ttl(options.ttl);
        } else if (options?.lease) {
            await this.client.put(key).value(value as string).lease(options.lease);
        } else {
            await this.client.put(key).value(value as string);
        }
    }

    async delete(key: string): Promise<boolean> {
        const result = await this.client.delete().key(key).exec();
        return result.deleted > 0;
    }

    async deleteByPrefix(prefix: string): Promise<number> {
        const result = await this.client.delete().key(prefix).prefix().exec();
        return result.deleted;
    }

    async exists(key: string): Promise<boolean> {
        return await this.client.get(key).exists();
    }

    async getKeysByPrefix(prefix: string): Promise<string[]> {
        return await this.client.getKeys(prefix);
    }

    // ==================== Directory Operations ====================

    async getEntries<T = string>(prefix: string): Promise<ConfigEntry<T>[]> {
        const results: ConfigEntry<T>[] = [];
        const pairs = await this.client.getPrefix(prefix);

        for (const pair of pairs) {
            results.push({
                key: pair.key,
                value: pair.value as T,
                version: pair.version,
                revision: pair.modRevision,
                created: pair.created,
            });
        }

        return results;
    }

    async getEntriesAsJSON<T = unknown>(prefix: string): Promise<Map<string, T>> {
        const entries = await this.getEntries<string>(prefix);
        const result = new Map<string, T>();

        for (const entry of entries) {
            try {
                result.set(entry.key, JSON.parse(entry.value) as T);
            } catch {
                result.set(entry.key, entry.value as unknown as T);
            }
        }

        return result;
    }

    // ==================== Lease Operations ====================

    async createLease(ttl: number): Promise<LeaseInfo> {
        const lease = this.client.lease(ttl);
        const id = await lease.id();
        return { id, ttl, remainingTTL: ttl };
    }

    async grantLease(ttl: number): Promise<string> {
        const lease = await this.client.grant(ttl);
        return lease;
    }

    async keepAlive(leaseId: string): Promise<void> {
        const lease = this.client.lease(0, { ID: leaseId });
        await lease.refresh();
    }

    async revokeLease(leaseId: string): Promise<void> {
        await this.client.revoke(leaseId);
    }

    // ==================== Watch Operations ====================

    watch<T = string>(key: string, callback: WatchCallback<T>): () => void {
        const watcher = this.client.watch().key(key).create();

        watcher.on('put', (event: { kv?: { key: string; value: string; version: number; mod_revision: number } }) => {
            if (event.kv) {
                callback({
                    type: 'put',
                    key: event.kv.key,
                    value: event.kv.value as T,
                    version: event.kv.version,
                    modRevision: event.kv.mod_revision,
                });
            }
        });

        watcher.on('delete', (event: { kv?: { key: string; version: number; mod_revision: number } }) => {
            if (event.kv) {
                callback({
                    type: 'delete',
                    key: event.kv.key,
                    value: null,
                    version: event.kv.version,
                    modRevision: event.kv.mod_revision,
                });
            }
        });

        watcher.on('error', (error: Error) => {
            this.logger.error(`Watch error for key ${key}:`, error);
        });

        this.watchers.set(key, watcher);

        return () => {
            watcher.cancel();
            this.watchers.delete(key);
        };
    }

    watchPrefix<T = string>(prefix: string, callback: WatchCallback<T>): () => void {
        const watcher = this.client.watch().prefix(prefix).create();

        watcher.on('put', (event: { kv?: { key: string; value: string; version: number; mod_revision: number } }) => {
            if (event.kv) {
                callback({
                    type: 'put',
                    key: event.kv.key,
                    value: event.kv.value as T,
                    version: event.kv.version,
                    modRevision: event.kv.mod_revision,
                });
            }
        });

        watcher.on('delete', (event: { kv?: { key: string; version: number; mod_revision: number } }) => {
            if (event.kv) {
                callback({
                    type: 'delete',
                    key: event.kv.key,
                    value: null,
                    version: event.kv.version,
                    modRevision: event.kv.mod_revision,
                });
            }
        });

        watcher.on('error', (error: Error) => {
            this.logger.error(`Watch error for prefix ${prefix}:`, error);
        });

        this.watchers.set(prefix, watcher);

        return () => {
            watcher.cancel();
            this.watchers.delete(prefix);
        };
    }

    // ==================== Cluster Operations ====================

    async healthCheck(): Promise<HealthResult> {
        try {
            const status = await this.client.status();
            return {
                healthy: true,
                leader: status.leader,
                etcdVersion: status.version,
            };
        } catch {
            return { healthy: false };
        }
    }

    async getMembers(): Promise<string[]> {
        const memberList = await this.client.memberList();
        return memberList.map((m) => m.name);
    }

    async getLeader(): Promise<string | null> {
        try {
            const status = await this.client.status();
            return status.leader || null;
        } catch {
            return null;
        }
    }

    // ==================== Transaction Operations ====================

    async compareAndSet(
        key: string,
        expectedValue: string | null,
        newValue: string,
        options?: { ttl?: number },
    ): Promise<boolean> {
        const tx = this.client.transaction();

        if (expectedValue === null) {
            tx.compare.notExists(key);
        } else {
            tx.compare.value(key, '==', expectedValue);
        }

        tx.then(this.client.put(key).value(newValue));

        if (options?.ttl) {
            tx.then(this.client.put(key).value(newValue).ttl(options.ttl));
        }

        const result = await tx.exec();
        return result.succeeded;
    }

    getClient(): Etcd3 {
        return this.client;
    }
}
