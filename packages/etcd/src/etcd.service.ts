import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    Etcd3,
    type IKeyValue,
    type IOptions,
    type IStatusResponse,
    type Lease,
    type Watcher,
} from 'etcd3';
import {
    ETCD_MODULE_OPTIONS,
    type ConfigEntry,
    type EtcdModuleOptions,
    type HealthResult,
    type LeaseInfo,
    type WatchCallback,
} from './etcd.types';

@Injectable()
export class EtcdService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EtcdService.name);
    private readonly client: Etcd3;
    private readonly watchers = new Map<string, Promise<Watcher>>();
    private readonly leases = new Map<string, Lease>();

    constructor(@Inject(ETCD_MODULE_OPTIONS) private readonly options: EtcdModuleOptions) {
        const etcdOptions: IOptions = {
            hosts: this.options.endpoints,
            credentials: this.options.tls
                ? {
                    rootCertificate: Buffer.from(this.options.tls.ca ?? ''),
                    privateKey: this.options.tls.key ? Buffer.from(this.options.tls.key) : undefined,
                    certChain: this.options.tls.cert ? Buffer.from(this.options.tls.cert) : undefined,
                }
                : undefined,
            auth: this.options.auth?.username && this.options.auth.password
                ? {
                    username: this.options.auth.username,
                    password: this.options.auth.password,
                }
                : undefined,
            defaultCallOptions: this.options.requestOptions?.timeout
                ? () => ({ deadline: Date.now() + this.options.requestOptions!.timeout! })
                : undefined,
        };

        this.client = new Etcd3(etcdOptions);
    }

    async onModuleInit(): Promise<void> {
        try {
            const health = await this.healthCheck();
            if (!health.healthy) {
                throw new Error('Etcd health check failed');
            }
            this.logger.log(`Successfully connected to etcd: ${this.options.endpoints.join(', ')}`);
        } catch (error) {
            this.logger.error('Failed to connect to etcd', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            for (const [key, watcher] of this.watchers) {
                this.logger.debug(`Canceling watcher: ${key}`);
                await (await watcher).cancel();
            }
            this.watchers.clear();

            for (const lease of this.leases.values()) {
                lease.release();
            }
            this.leases.clear();

            this.client.close();
            this.logger.log('Etcd connection closed');
        } catch (error) {
            this.logger.error('Error closing etcd connection', error);
        }
    }

    async get<T = string>(key: string): Promise<T | null> {
        const value = await this.client.get(key).string();
        return value === null ? null : (value as T);
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

    async set(
        key: string,
        value: string | number | boolean | object,
        options?: { ttl?: number; lease?: string },
    ): Promise<void> {
        const serialized = serializeValue(value);

        if (options?.ttl && !options.lease) {
            const lease = this.client.lease(options.ttl, { autoKeepAlive: false });
            const leaseId = await lease.grant();
            this.leases.set(String(leaseId), lease);
            await lease.put(key).value(serialized).exec();
            return;
        }

        const builder = this.client.put(key).value(serialized);
        if (options?.lease) {
            builder.lease(options.lease);
        }
        await builder.exec();
    }

    async delete(key: string): Promise<boolean> {
        const result = await this.client.delete().key(key).exec();
        return Number(result.deleted) > 0;
    }

    async deleteByPrefix(prefix: string): Promise<number> {
        const result = await this.client.delete().prefix(prefix).exec();
        return Number(result.deleted);
    }

    async exists(key: string): Promise<boolean> {
        return this.client.get(key).exists();
    }

    async getKeysByPrefix(prefix: string): Promise<string[]> {
        return this.client.getAll().prefix(prefix).keys();
    }

    async getEntries<T = string>(prefix: string): Promise<ConfigEntry<T>[]> {
        const response = await this.client.getAll().prefix(prefix).exec();
        return response.kvs.map(kv => ({
            key: decodeBuffer(kv.key),
            value: decodeBuffer(kv.value) as T,
            version: Number(kv.version),
            revision: Number(kv.mod_revision),
            created: kv.create_revision === kv.mod_revision,
        }));
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

    async createLease(ttl: number): Promise<LeaseInfo> {
        const lease = this.client.lease(ttl);
        const id = await lease.grant();
        this.leases.set(String(id), lease);
        return { id: String(id), ttl, remainingTTL: ttl };
    }

    async grantLease(ttl: number): Promise<string> {
        return (await this.createLease(ttl)).id;
    }

    async keepAlive(leaseId: string): Promise<void> {
        const lease = this.leases.get(String(leaseId));
        if (!lease) {
            throw new Error(`Lease ${leaseId} is not managed by this EtcdService instance`);
        }
        await lease.keepaliveOnce();
    }

    async revokeLease(leaseId: string): Promise<void> {
        const lease = this.leases.get(String(leaseId));
        if (lease) {
            await lease.revoke();
            this.leases.delete(String(leaseId));
            return;
        }
        await this.client.leaseClient.leaseRevoke({ ID: leaseId });
    }

    watch<T = string>(key: string, callback: WatchCallback<T>): () => void {
        const watcher = this.client.watch().key(key).create().then(watcher => {
            this.attachWatcherHandlers(watcher, key, callback);
            return watcher;
        });
        this.watchers.set(key, watcher);

        return () => {
            void watcher.then(w => w.cancel()).catch(error => this.logger.error(`Cancel watcher failed: ${key}`, error));
            this.watchers.delete(key);
        };
    }

    watchPrefix<T = string>(prefix: string, callback: WatchCallback<T>): () => void {
        const watcher = this.client.watch().prefix(prefix).create().then(watcher => {
            this.attachWatcherHandlers(watcher, prefix, callback);
            return watcher;
        });
        this.watchers.set(prefix, watcher);

        return () => {
            void watcher.then(w => w.cancel()).catch(error => this.logger.error(`Cancel watcher failed: ${prefix}`, error));
            this.watchers.delete(prefix);
        };
    }

    async healthCheck(): Promise<HealthResult> {
        try {
            const status = await this.getStatus();
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
        const memberList = await this.client.cluster.memberList({});
        return memberList.members.map(member => member.name).filter((name): name is string => Boolean(name));
    }

    async getLeader(): Promise<string | null> {
        try {
            const status = await this.getStatus();
            return status.leader || null;
        } catch {
            return null;
        }
    }

    async compareAndSet(
        key: string,
        expectedValue: string | null,
        newValue: string,
        options?: { ttl?: number },
    ): Promise<boolean> {
        const comparison = expectedValue === null
            ? this.client.if(key, 'Create', '==', 0)
            : this.client.if(key, 'Value', '==', expectedValue);
        const put = options?.ttl
            ? this.client.lease(options.ttl, { autoKeepAlive: false }).put(key).value(newValue)
            : this.client.put(key).value(newValue);
        const result = await comparison.then(put).commit();
        return result.succeeded;
    }

    getClient(): Etcd3 {
        return this.client;
    }

    private async getStatus(): Promise<IStatusResponse> {
        return this.client.maintenance.status();
    }

    private attachWatcherHandlers<T>(watcher: Watcher, label: string, callback: WatchCallback<T>): void {
        watcher.on('put', kv => {
            callback({
                type: 'put',
                key: decodeBuffer(kv.key),
                value: decodeBuffer(kv.value) as T,
                version: Number(kv.version),
                modRevision: Number(kv.mod_revision),
            });
        });

        watcher.on('delete', kv => {
            callback({
                type: 'delete',
                key: decodeBuffer(kv.key),
                value: null,
                version: Number(kv.version),
                modRevision: Number(kv.mod_revision),
            });
        });

        watcher.on('error', error => {
            this.logger.error(`Watch error for ${label}:`, error);
        });
    }
}

function serializeValue(value: string | number | boolean | object): string | number {
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
        return String(value);
    }
    return value;
}

function decodeBuffer(value: IKeyValue['key']): string {
    return Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
}
