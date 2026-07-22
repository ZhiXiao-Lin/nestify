import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { retry as createRetryPolicy, handleWhen } from 'cockatiel';
import {
    Etcd3,
    type IKeyValue,
    type IOptions,
    type IStatusResponse,
    isRecoverableError,
    type Lease,
    type Watcher,
} from 'etcd3';
import {
    type ConfigEntry,
    ETCD_MODULE_OPTIONS,
    type EtcdModuleOptions,
    type HealthResult,
    type LeaseInfo,
    type WatchCallback,
} from './etcd.types';

@Injectable()
export class EtcdService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EtcdService.name);
    private readonly client: Etcd3;
    private readonly watchers = new Map<number, WatchRegistration>();
    private readonly leases = new Map<string, Lease>();
    private nextWatcherId = 0;
    private destroyPromise?: Promise<void>;

    constructor(@Inject(ETCD_MODULE_OPTIONS) private readonly options: EtcdModuleOptions) {
        validateOptions(this.options);

        const timeout = this.options.requestOptions?.timeout;
        const retry = this.options.requestOptions?.retry;
        const etcdOptions: IOptions = {
            hosts: this.options.endpoints,
            credentials: this.options.tls
                ? {
                      rootCertificate: Buffer.from(this.options.tls.ca ?? ''),
                      privateKey: this.options.tls.key ? Buffer.from(this.options.tls.key) : undefined,
                      certChain: this.options.tls.cert ? Buffer.from(this.options.tls.cert) : undefined,
                  }
                : undefined,
            auth:
                this.options.auth?.username && this.options.auth.password
                    ? {
                          username: this.options.auth.username,
                          password: this.options.auth.password,
                      }
                    : undefined,
            defaultCallOptions: timeout
                ? context => (context.isStream ? {} : { deadline: Date.now() + timeout })
                : undefined,
            faultHandling:
                retry === undefined
                    ? undefined
                    : {
                          global: createRetryPolicy(handleWhen(isRecoverableError), { maxAttempts: retry }),
                      },
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
        this.destroyPromise ??= this.destroyResources();
        await this.destroyPromise;
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

        if (options?.ttl !== undefined) {
            validateTtl(options.ttl);
        }
        if (options?.ttl !== undefined && options.lease) {
            throw new Error('ttl and lease cannot be used together');
        }

        if (options?.ttl !== undefined) {
            const lease = this.client.lease(options.ttl, { autoKeepAlive: false });
            try {
                await lease.grant();
                await lease.put(key).value(serialized).exec();
            } finally {
                lease.release();
            }
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
            created: Number(kv.create_revision) === Number(kv.mod_revision),
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
        validateTtl(ttl);
        const lease = this.client.lease(ttl);
        const id = await lease.grant();
        const leaseId = String(id);
        this.leases.set(leaseId, lease);
        lease.once('lost', () => {
            if (this.leases.get(leaseId) === lease) {
                this.leases.delete(leaseId);
            }
        });
        return { id: leaseId, ttl, remainingTTL: ttl };
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
        return this.registerWatcher(key, () => this.client.watch().key(key).create(), callback);
    }

    watchPrefix<T = string>(prefix: string, callback: WatchCallback<T>): () => void {
        return this.registerWatcher(prefix, () => this.client.watch().prefix(prefix).create(), callback);
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
        if (options?.ttl !== undefined) {
            validateTtl(options.ttl);
        }
        const comparison =
            expectedValue === null
                ? this.client.if(key, 'Create', '==', 0)
                : this.client.if(key, 'Value', '==', expectedValue);
        const lease = options?.ttl === undefined ? undefined : this.client.lease(options.ttl, { autoKeepAlive: false });
        const put = lease ? lease.put(key).value(newValue) : this.client.put(key).value(newValue);

        try {
            const result = await comparison.then(put).commit();
            return result.succeeded;
        } finally {
            lease?.release();
        }
    }

    getClient(): Etcd3 {
        return this.client;
    }

    private async getStatus(): Promise<IStatusResponse> {
        return this.client.maintenance.status();
    }

    private registerWatcher<T>(label: string, create: () => Promise<Watcher>, callback: WatchCallback<T>): () => void {
        if (this.destroyPromise) {
            throw new Error('Cannot create an etcd watcher after shutdown has started');
        }

        const id = ++this.nextWatcherId;
        let active = true;
        let cancellation: Promise<void> | undefined;
        const watcher = Promise.resolve()
            .then(create)
            .then(created => {
                this.attachWatcherHandlers<T>(created, label, event => {
                    if (active) {
                        return callback(event);
                    }
                });
                return created;
            })
            .catch(error => {
                this.watchers.delete(id);
                this.logger.error(`Create watcher failed: ${label}`, error);
                return undefined;
            });
        const registration: WatchRegistration = {
            label,
            cancel: () => {
                active = false;
                cancellation ??= watcher
                    .then(created => created?.cancel())
                    .then(() => undefined)
                    .finally(() => {
                        this.watchers.delete(id);
                    });
                return cancellation;
            },
        };
        this.watchers.set(id, registration);

        let unsubscribed = false;
        return () => {
            if (unsubscribed) return;
            unsubscribed = true;
            void registration.cancel().catch(error => this.logger.error(`Cancel watcher failed: ${label}`, error));
        };
    }

    private attachWatcherHandlers<T>(watcher: Watcher, label: string, callback: WatchCallback<T>): void {
        watcher.on('put', kv => {
            this.invokeWatchCallback(label, callback, {
                type: 'put',
                key: decodeBuffer(kv.key),
                value: decodeBuffer(kv.value) as T,
                version: Number(kv.version),
                modRevision: Number(kv.mod_revision),
            });
        });

        watcher.on('delete', kv => {
            this.invokeWatchCallback(label, callback, {
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

    private invokeWatchCallback<T>(
        label: string,
        callback: WatchCallback<T>,
        event: Parameters<WatchCallback<T>>[0],
    ): void {
        try {
            void Promise.resolve(callback(event)).catch(error => {
                this.logger.error(`Watch callback failed: ${label}`, error);
            });
        } catch (error) {
            this.logger.error(`Watch callback failed: ${label}`, error);
        }
    }

    private async destroyResources(): Promise<void> {
        const watcherResults = await Promise.allSettled(
            [...this.watchers.values()].map(async registration => {
                this.logger.debug(`Canceling watcher: ${registration.label}`);
                await registration.cancel();
            }),
        );
        this.watchers.clear();
        for (const result of watcherResults) {
            if (result.status === 'rejected') {
                this.logger.error('Error canceling etcd watcher', result.reason);
            }
        }

        for (const lease of this.leases.values()) {
            try {
                lease.release();
            } catch (error) {
                this.logger.error('Error releasing etcd lease', error);
            }
        }
        this.leases.clear();

        try {
            this.client.close();
            this.logger.log('Etcd connection closed');
        } catch (error) {
            this.logger.error('Error closing etcd connection', error);
        }
    }
}

interface WatchRegistration {
    label: string;
    cancel: () => Promise<void>;
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

function validateOptions(options: EtcdModuleOptions): void {
    if (!Array.isArray(options.endpoints) || options.endpoints.length === 0) {
        throw new Error('At least one etcd endpoint is required');
    }
    if (options.endpoints.some(endpoint => typeof endpoint !== 'string' || endpoint.trim().length === 0)) {
        throw new Error('Etcd endpoints must be non-empty strings');
    }
    if (Boolean(options.auth?.username) !== Boolean(options.auth?.password)) {
        throw new Error('Etcd auth requires both username and password');
    }
    if (Boolean(options.tls?.cert) !== Boolean(options.tls?.key)) {
        throw new Error('Etcd TLS client authentication requires both cert and key');
    }

    const timeout = options.requestOptions?.timeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
        throw new Error('Etcd request timeout must be a positive number');
    }
    const retry = options.requestOptions?.retry;
    if (retry !== undefined && (!Number.isInteger(retry) || retry < 0)) {
        throw new Error('Etcd retry count must be a non-negative integer');
    }
}

function validateTtl(ttl: number): void {
    if (!Number.isInteger(ttl) || ttl <= 0) {
        throw new Error('Etcd lease TTL must be a positive integer');
    }
}
