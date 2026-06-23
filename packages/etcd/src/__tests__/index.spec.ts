import { EtcdConfigService } from '../config.service';
import { ETCD_MODULE_OPTIONS } from '../etcd.types';
import { EtcdModule } from '../etcd.module';
import { EtcdService } from '../etcd.service';

const mockEtcd3 = jest.fn();
let mockClient: any;
let mockWatcher: any;

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
    const lease = {
        grant: jest.fn(async () => id),
        keepaliveOnce: jest.fn(async () => undefined),
        revoke: jest.fn(async () => undefined),
        release: jest.fn(),
        put: jest.fn((key: string) => createPutBuilder(key, store)),
    };
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

function createClient() {
    const store = new Map<string, string>([
        ['settings/api', JSON.stringify({ enabled: true })],
        ['settings/name', 'api'],
    ]);
    const lease = createLease('lease-1', store);
    mockWatcher = createWatcher();

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
                create: jest.fn(async () => mockWatcher),
            })),
            prefix: jest.fn(() => ({
                create: jest.fn(async () => mockWatcher),
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
            requestOptions: { timeout: 5000 },
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
            }),
        );
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
        await Promise.resolve();
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
        await Promise.resolve();
        await service.revokeLease(lease.id);
        await service.onModuleDestroy();

        expect(mockWatcher.cancel).toHaveBeenCalled();
        expect(mockClient.close).toHaveBeenCalled();
    });

    it('caches configuration values and forwards subscriptions', async () => {
        let watchCallback: ((event: { value: unknown }) => void) | undefined;
        const unsubscribe = jest.fn();
        const etcd = {
            get: jest.fn(async () => 'cached-value'),
            getJSON: jest.fn(async () => ({ enabled: true })),
            getEntriesAsJSON: jest.fn(async () => new Map([['settings/api', { enabled: true }]])),
            set: jest.fn(async () => undefined),
            delete: jest.fn(async () => true),
            deleteByPrefix: jest.fn(async () => 1),
            exists: jest.fn(async () => true),
            watch: jest.fn((_key: string, callback: (event: { value: unknown }) => void) => {
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
        watchCallback?.({ value: 'changed' });
        stop();

        expect(etcd.get).toHaveBeenCalledTimes(1);
        expect(etcd.set).toHaveBeenCalledWith('settings/api', { enabled: false }, undefined);
        expect(subscriber).toHaveBeenCalledWith('changed');
        expect(unsubscribe).toHaveBeenCalled();
    });
});
