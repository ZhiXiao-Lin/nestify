import { EtcdConfigService } from '../config.service';
import { EtcdModule } from '../etcd.module';
import { EtcdService } from '../etcd.service';
import { ETCD_MODULE_OPTIONS } from '../etcd.types';

const mockEtcd3 = jest.fn();
let mockClient: any;
let mockWatcher: any;
let mockWatchers: any[];

jest.mock('etcd3', () => ({
    Etcd3: jest.fn().mockImplementation((options: Record<string, unknown>) => {
        mockEtcd3(options);
        return mockClient;
    }),
}));

function kv(key: string, value: string, version = 1) {
    return {
        key: Buffer.from(key),
        value: Buffer.from(value),
        version,
        mod_revision: version,
        create_revision: version,
    };
}

function createLease(id: string, store: Map<string, string>) {
    const lease: any = {
        grant: jest.fn(async () => id),
        keepaliveOnce: jest.fn(async () => undefined),
        revoke: jest.fn(async () => undefined),
        release: jest.fn(),
        put: jest.fn((key: string) => createPutBuilder(key, store)),
    };
    lease.once = jest.fn((_event: string, handler: () => void) => {
        lease.lostHandler = handler;
        return lease;
    });
    return lease;
}

function createPutBuilder(key: string, store: Map<string, string>) {
    const builder = {
        currentValue: undefined as string | number | undefined,
        currentLease: undefined as string | undefined,
        value: jest.fn((value: string | number) => {
            builder.currentValue = value;
            return builder;
        }),
        lease: jest.fn((leaseId: string) => {
            builder.currentLease = leaseId;
            return builder;
        }),
        exec: jest.fn(async () => {
            store.set(key, String(builder.currentValue));
            return {};
        }),
    };
    return builder;
}

function createWatcher() {
    const handlers = new Map<string, (event: any) => void>();
    return {
        handlers,
        on: jest.fn((event: string, handler: (value: any) => void) => {
            handlers.set(event, handler);
        }),
        cancel: jest.fn(async () => undefined),
    };
}

function flushAsyncWork(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

function createClient() {
    const store = new Map<string, string>([
        ['settings/api', JSON.stringify({ enabled: true })],
        ['settings/name', 'api'],
    ]);
    const lease = createLease('lease-1', store);
    mockWatchers = [];

    const nextWatcher = () => {
        mockWatcher = createWatcher();
        mockWatchers.push(mockWatcher);
        return mockWatcher;
    };

    return {
        get: jest.fn((key: string) => ({
            string: jest.fn(async () => store.get(key) ?? null),
            exists: jest.fn(async () => store.has(key)),
        })),
        getAll: jest.fn(() => ({
            prefix: jest.fn((prefix: string) => ({
                keys: jest.fn(async () => [...store.keys()].filter(key => key.startsWith(prefix))),
                exec: jest.fn(async () => ({
                    kvs: [...store.entries()]
                        .filter(([key]) => key.startsWith(prefix))
                        .map(([key, value], index) => kv(key, value, index + 1)),
                })),
            })),
        })),
        put: jest.fn((key: string) => createPutBuilder(key, store)),
        delete: jest.fn(() => ({
            key: jest.fn((key: string) => ({
                exec: jest.fn(async () => ({ deleted: store.delete(key) ? 1 : 0 })),
            })),
            prefix: jest.fn((prefix: string) => ({
                exec: jest.fn(async () => {
                    const keys = [...store.keys()].filter(key => key.startsWith(prefix));
                    for (const key of keys) {
                        store.delete(key);
                    }
                    return { deleted: keys.length };
                }),
            })),
        })),
        lease: jest.fn(() => lease),
        leaseClient: {
            leaseRevoke: jest.fn(async () => undefined),
        },
        watch: jest.fn(() => ({
            key: jest.fn(() => ({
                create: jest.fn(async () => nextWatcher()),
            })),
            prefix: jest.fn(() => ({
                create: jest.fn(async () => nextWatcher()),
            })),
        })),
        maintenance: {
            status: jest.fn(async () => ({ leader: 'node-1', version: '3.5.0' })),
        },
        cluster: {
            memberList: jest.fn(async () => ({ members: [{ name: 'node-1' }, { name: '' }] })),
        },
        if: jest.fn(() => {
            const comparison: Record<string, unknown> = {};
            Object.defineProperty(comparison, 'then', {
                value: jest.fn(() => ({
                    commit: jest.fn(async () => ({ succeeded: true })),
                })),
            });
            return comparison;
        }),
        close: jest.fn(),
    };
}

describe('etcd package', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = createClient();
    });

    it('exports static and async module registrations', () => {
        const options = { endpoints: ['http://etcd:2379'] };
        const staticModule = EtcdModule.register(options);
        const asyncModule = EtcdModule.registerAsync({
            useFactory: () => options,
            inject: [],
        });

        expect(staticModule.module).toBe(EtcdModule);
        expect(staticModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: ETCD_MODULE_OPTIONS, useValue: options }),
                EtcdService,
                EtcdConfigService,
            ]),
        );
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: ETCD_MODULE_OPTIONS, useFactory: expect.any(Function) }),
                EtcdService,
                EtcdConfigService,
            ]),
        );
    });

    it('creates the client with connection options and reports health', async () => {
        const service = new EtcdService({
            endpoints: ['http://etcd:2379'],
            auth: { username: 'user', password: 'pass' },
            tls: { ca: 'ca', cert: 'cert', key: 'key' },
            requestOptions: { timeout: 5000, retry: 2 },
        });

        await service.onModuleInit();
        const health = await service.healthCheck();
        const members = await service.getMembers();
        const leader = await service.getLeader();

        expect(mockEtcd3).toHaveBeenCalledWith(
            expect.objectContaining({
                hosts: ['http://etcd:2379'],
                auth: { username: 'user', password: 'pass' },
                credentials: expect.objectContaining({
                    rootCertificate: Buffer.from('ca'),
                    privateKey: Buffer.from('key'),
                    certChain: Buffer.from('cert'),
                }),
                defaultCallOptions: expect.any(Function),
                faultHandling: { global: expect.any(Object) },
            }),
        );
        const clientOptions = mockEtcd3.mock.calls[0][0];
        expect(clientOptions.defaultCallOptions({ isStream: true })).toEqual({});
        expect(clientOptions.defaultCallOptions({ isStream: false }).deadline).toBeGreaterThan(Date.now());
        expect(health).toEqual({ healthy: true, leader: 'node-1', etcdVersion: '3.5.0' });
        expect(members).toEqual(['node-1']);
        expect(leader).toBe('node-1');
    });

    it('reads, writes, deletes, and lists entries by prefix', async () => {
        const service = new EtcdService({ endpoints: ['http://etcd:2379'] });

        await expect(service.getJSON('settings/api')).resolves.toEqual({ enabled: true });
        await service.set('settings/limit', { max: 10 });
        await expect(service.getJSON('settings/limit')).resolves.toEqual({ max: 10 });
        await expect(service.exists('settings/name')).resolves.toBe(true);
        await expect(service.getKeysByPrefix('settings/')).resolves.toEqual([
            'settings/api',
            'settings/name',
            'settings/limit',
        ]);
        await expect(service.getEntriesAsJSON('settings/')).resolves.toEqual(
            new Map<string, unknown>([
                ['settings/api', { enabled: true }],
                ['settings/name', 'api'],
                ['settings/limit', { max: 10 }],
            ]),
        );
        await expect(service.delete('settings/name')).resolves.toBe(true);
        await expect(service.deleteByPrefix('settings/')).resolves.toBe(2);
    });

    it('manages leases, watches, compare-and-set, and cleanup', async () => {
        const service = new EtcdService({ endpoints: ['http://etcd:2379'] });

        const lease = await service.createLease(30);
        await service.keepAlive(lease.id);
        await service.set('settings/temporary', 'enabled', { lease: lease.id });
        await expect(service.compareAndSet('settings/flag', null, 'enabled', { ttl: 10 })).resolves.toBe(true);

        const handleChange = jest.fn();
        const unsubscribe = service.watch('settings/api', handleChange);
        await flushAsyncWork();
        mockWatcher.handlers.get('put')?.(kv('settings/api', 'changed', 2));
        mockWatcher.handlers.get('delete')?.(kv('settings/api', '', 3));

        expect(handleChange).toHaveBeenCalledWith({
            type: 'put',
            key: 'settings/api',
            value: 'changed',
            version: 2,
            modRevision: 2,
        });
        expect(handleChange).toHaveBeenCalledWith({
            type: 'delete',
            key: 'settings/api',
            value: null,
            version: 3,
            modRevision: 3,
        });

        unsubscribe();
        await flushAsyncWork();
        await service.revokeLease(lease.id);
        await service.onModuleDestroy();

        expect(mockWatcher.cancel).toHaveBeenCalled();
        expect(mockClient.close).toHaveBeenCalled();
    });

    it('tracks duplicate watchers independently and always completes shutdown cleanup', async () => {
        const service = new EtcdService({ endpoints: ['http://etcd:2379'] });
        await service.createLease(30);
        const failedSubscriber = jest.fn(() => {
            throw new Error('subscriber failed');
        });
        const firstStop = service.watch('settings/api', failedSubscriber);
        service.watch('settings/api', jest.fn());
        await flushAsyncWork();

        expect(mockWatchers).toHaveLength(2);
        expect(() => mockWatchers[0].handlers.get('put')?.(kv('settings/api', 'changed'))).not.toThrow();
        mockWatchers[0].cancel.mockRejectedValueOnce(new Error('cancel failed'));
        firstStop();
        mockWatchers[0].handlers.get('put')?.(kv('settings/api', 'ignored'));
        await flushAsyncWork();
        await service.onModuleDestroy();
        await service.onModuleDestroy();

        expect(mockWatchers[0].cancel).toHaveBeenCalledTimes(1);
        expect(mockWatchers[1].cancel).toHaveBeenCalledTimes(1);
        expect(failedSubscriber).toHaveBeenCalledTimes(1);
        expect(mockClient.lease.mock.results[0].value.release).toHaveBeenCalled();
        expect(mockClient.close).toHaveBeenCalledTimes(1);
        expect(() => service.watch('settings/api', jest.fn())).toThrow('shutdown has started');
    });

    it('validates connection and lease options', async () => {
        expect(() => new EtcdService({ endpoints: [] })).toThrow('At least one etcd endpoint');
        expect(() => new EtcdService({ endpoints: ['http://etcd:2379'], auth: { username: 'user' } })).toThrow(
            'both username and password',
        );
        expect(() => new EtcdService({ endpoints: ['http://etcd:2379'], requestOptions: { retry: -1 } })).toThrow(
            'non-negative integer',
        );

        const service = new EtcdService({ endpoints: ['http://etcd:2379'] });
        await expect(service.createLease(0)).rejects.toThrow('positive integer');
        await expect(service.set('key', 'value', { ttl: 10, lease: 'lease-1' })).rejects.toThrow(
            'cannot be used together',
        );
    });

    it('caches configuration values and forwards subscriptions', async () => {
        let watchCallback: ((event: { key: string; value: unknown | null }) => void) | undefined;
        const unsubscribe = jest.fn();
        const etcd = {
            get: jest.fn(async () => 'cached-value'),
            getJSON: jest.fn(async () => ({ enabled: true })),
            getEntriesAsJSON: jest.fn(async () => new Map([['settings/api', { enabled: true }]])),
            set: jest.fn(async () => undefined),
            delete: jest.fn(async () => true),
            deleteByPrefix: jest.fn(async () => 1),
            exists: jest.fn(async () => true),
            watch: jest.fn((_key: string, callback: (event: { key: string; value: unknown | null }) => void) => {
                watchCallback = callback;
                return unsubscribe;
            }),
            watchPrefix: jest.fn(() => unsubscribe),
        } as unknown as EtcdService;
        const config = new EtcdConfigService(etcd);

        await expect(config.get('settings/value')).resolves.toBe('cached-value');
        await expect(config.get('settings/value')).resolves.toBe('cached-value');
        await config.setJSON('settings/api', { enabled: false });
        await expect(config.getJSON('settings/api')).resolves.toEqual({ enabled: false });

        const subscriber = jest.fn();
        const stop = config.subscribe('settings/api', subscriber);
        watchCallback?.({ key: 'settings/api', value: 'changed' });
        watchCallback?.({ key: 'settings/api', value: null });
        stop();

        expect(etcd.get).toHaveBeenCalledTimes(1);
        expect(etcd.set).toHaveBeenCalledWith('settings/api', { enabled: false }, undefined);
        expect(subscriber).toHaveBeenCalledWith('changed');
        expect(subscriber).toHaveBeenCalledWith(null);
        expect(unsubscribe).toHaveBeenCalled();
    });

    it('separates raw and JSON caches, coalesces reads, and prevents stale cache races', async () => {
        let resolveRead: ((value: string | null) => void) | undefined;
        let watchCallback: ((event: { key: string; value: string | null }) => void) | undefined;
        const get = jest.fn(
            () =>
                new Promise<string | null>(resolve => {
                    resolveRead = resolve;
                }),
        );
        const etcd = {
            get,
            getJSON: jest.fn(async () => ({ enabled: true })),
            watch: jest.fn((_key: string, callback: (event: { key: string; value: string | null }) => void) => {
                watchCallback = callback;
                return jest.fn();
            }),
        } as unknown as EtcdService;
        const config = new EtcdConfigService(etcd);
        config.subscribe('settings/api', jest.fn());

        const first = config.get('settings/api');
        const second = config.get('settings/api');
        expect(get).toHaveBeenCalledTimes(1);
        watchCallback?.({ key: 'settings/api', value: '{"enabled":false}' });
        resolveRead?.('{"enabled":true}');

        await expect(first).resolves.toBe('{"enabled":true}');
        await expect(second).resolves.toBe('{"enabled":true}');
        await expect(config.get('settings/api')).resolves.toBe('{"enabled":false}');
        await expect(config.getJSON<{ enabled: boolean }>('settings/api')).resolves.toEqual({ enabled: false });
        expect(get).toHaveBeenCalledTimes(1);
        expect(etcd.getJSON as jest.Mock).not.toHaveBeenCalled();
    });

    it('keeps write, delete, and prefix-watch cache entries coherent', async () => {
        const values = new Map<string, string>([
            ['settings/api', 'old'],
            ['other/value', 'stable'],
        ]);
        let prefixCallback: ((event: { key: string; value: string | null }) => void) | undefined;
        const prefixUnsubscribe = jest.fn();
        const etcd = {
            get: jest.fn(async (key: string) => values.get(key) ?? null),
            getJSON: jest.fn(async (key: string) => {
                const value = values.get(key);
                return value === undefined ? null : JSON.parse(value);
            }),
            set: jest.fn(async (key: string, value: unknown) => {
                values.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            }),
            delete: jest.fn(async (key: string) => values.delete(key)),
            deleteByPrefix: jest.fn(async (prefix: string) => {
                const keys = [...values.keys()].filter(key => key.startsWith(prefix));
                for (const key of keys) values.delete(key);
                return keys.length;
            }),
            watchPrefix: jest.fn(
                (_prefix: string, callback: (event: { key: string; value: string | null }) => void) => {
                    prefixCallback = callback;
                    return prefixUnsubscribe;
                },
            ),
        } as unknown as EtcdService;
        const config = new EtcdConfigService(etcd);
        const prefixSubscriber = jest.fn();
        const stop = config.subscribePrefix('settings/', prefixSubscriber);

        await expect(config.get('settings/api')).resolves.toBe('old');
        await expect(config.get('other/value')).resolves.toBe('stable');
        values.set('settings/api', 'new');
        prefixCallback?.({ key: 'settings/api', value: 'new' });
        await expect(config.get('settings/api')).resolves.toBe('new');
        expect(etcd.get).toHaveBeenCalledTimes(2);

        values.delete('settings/api');
        prefixCallback?.({ key: 'settings/api', value: null });
        await expect(config.get('settings/api')).resolves.toBeNull();
        await expect(config.get('settings/api')).resolves.toBeNull();
        expect(prefixSubscriber).toHaveBeenLastCalledWith({ key: 'settings/api', value: null });
        expect(etcd.get).toHaveBeenCalledTimes(3);

        await config.setJSON('settings/json', { enabled: true });
        await expect(config.get('settings/json')).resolves.toBe('{"enabled":true}');
        await expect(config.getJSON('settings/json')).resolves.toEqual({ enabled: true });
        await config.deleteByPrefix('settings/');
        await expect(config.get('settings/json')).resolves.toBeNull();
        await expect(config.get('other/value')).resolves.toBe('stable');

        stop();
        expect(prefixUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('supports cache controls and validates cache configuration', async () => {
        const etcd = {
            get: jest.fn(async () => null),
        } as unknown as EtcdService;
        const config = new EtcdConfigService(etcd);

        await config.get('missing');
        await config.get('missing');
        expect(etcd.get).toHaveBeenCalledTimes(1);

        config.setCacheMissing(false);
        await config.get('missing');
        await config.get('missing');
        expect(etcd.get).toHaveBeenCalledTimes(3);

        config.setCacheTtl(0);
        await config.get('missing');
        await config.get('missing');
        expect(etcd.get).toHaveBeenCalledTimes(5);
        expect(() => config.setCacheTtl(-1)).toThrow('non-negative number');
        expect(() => config.setCacheMaxEntries(-1)).toThrow('non-negative integer');
        expect(
            () =>
                new EtcdConfigService(etcd, {
                    endpoints: ['http://etcd:2379'],
                    configCache: { maxEntries: 1.5 },
                }),
        ).toThrow('non-negative integer');
    });

    it('shares prefix watches, bounds the cache, and releases subscriptions on shutdown', async () => {
        const exactUnsubscribe = jest.fn();
        const prefixUnsubscribe = jest.fn();
        const etcd = {
            get: jest.fn(async (key: string) => key),
            watch: jest.fn(() => exactUnsubscribe),
            watchPrefix: jest.fn(() => prefixUnsubscribe),
        } as unknown as EtcdService;
        const config = new EtcdConfigService(etcd, {
            endpoints: ['http://etcd:2379'],
            configCache: { maxEntries: 1 },
        });

        await config.get('first');
        await config.get('second');
        await config.get('first');
        expect(etcd.get).toHaveBeenCalledTimes(3);

        const stopExactOne = config.subscribe('settings/api', jest.fn());
        config.subscribe('settings/api', jest.fn());
        config.subscribePrefix('settings/', jest.fn());
        config.subscribePrefix('settings/', jest.fn());
        expect(etcd.watch).toHaveBeenCalledTimes(1);
        expect(etcd.watchPrefix).toHaveBeenCalledTimes(1);

        stopExactOne();
        expect(exactUnsubscribe).not.toHaveBeenCalled();
        config.onModuleDestroy();
        config.onModuleDestroy();
        expect(exactUnsubscribe).toHaveBeenCalledTimes(1);
        expect(prefixUnsubscribe).toHaveBeenCalledTimes(1);
        expect(() => config.subscribe('settings/api', jest.fn())).toThrow('shutdown has started');
    });
});
