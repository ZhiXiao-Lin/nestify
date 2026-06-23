import { MODULE_OPTIONS_TOKEN } from '../nats.module-definition';
import { NatsModule } from '../nats.module';
import { NatsService, NatsServiceImpl } from '../index';

const mockConnect = jest.fn();

jest.mock('nats', () => ({
    connect: (...args: unknown[]) => mockConnect(...args),
    Events: {
        Reconnect: 'reconnect',
        Error: 'error',
        Disconnect: 'disconnect',
    },
    headers: jest.fn(() => createHeaders()),
    StringCodec: jest.fn(() => ({
        encode: (value: string) => Buffer.from(value),
        decode: (value: Uint8Array) => Buffer.from(value).toString('utf8'),
    })),
}));

function createHeaders(initial: Record<string, string[]> = {}) {
    const values: Record<string, string[]> = { ...initial };

    return {
        values,
        set: jest.fn((key: string, value: string) => {
            values[key] = [value];
        }),
        *[Symbol.iterator]() {
            for (const entry of Object.entries(values)) {
                yield entry;
            }
        },
    };
}

function createSubscription(id = 7) {
    let closed = false;

    return {
        getID: jest.fn(() => id),
        unsubscribe: jest.fn(() => {
            closed = true;
        }),
        isClosed: jest.fn(() => closed),
        async *[Symbol.asyncIterator]() {},
    };
}

describe('nats package', () => {
    let mockConnection: any;
    let mockJetStream: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockJetStream = {
            publish: jest.fn(async () => ({
                stream: 'RESOURCE_EVENTS',
                seq: 1,
                duplicate: false,
            })),
            subscribe: jest.fn(() => createSubscription(9)),
        };

        mockConnection = {
            getServer: jest.fn(() => 'nats://broker:4222'),
            closed: jest.fn(() => new Promise<never>(() => undefined)),
            close: jest.fn(async () => undefined),
            status: jest.fn(async function* () {}),
            jetstream: jest.fn(() => mockJetStream),
            publish: jest.fn(),
            request: jest.fn(async () => ({
                subject: 'resources.lookup.reply',
                sid: 3,
                data: Buffer.from(JSON.stringify({ status: 'ready' })),
                headers: createHeaders({ 'x-result': ['ok'] }),
                reply: undefined,
            })),
            subscribe: jest.fn(() => createSubscription()),
        };

        mockConnect.mockResolvedValue(mockConnection);
    });

    it('exports stable service names and module registrations', () => {
        const options = { servers: ['nats://broker:4222'] };
        const staticModule = NatsModule.register(options);
        const asyncModule = NatsModule.registerAsync({
            useFactory: () => options,
        });

        expect(NatsService).toBe(NatsServiceImpl);
        expect(staticModule.module).toBe(NatsModule);
        expect(staticModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useValue: options }),
                NatsServiceImpl,
            ]),
        );
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useFactory: expect.any(Function) }),
                NatsServiceImpl,
            ]),
        );
    });

    it('connects with defaults and publishes encoded payloads with headers', async () => {
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            name: 'api-service',
            timeout: 5000,
        });

        await service.onModuleInit();
        await service.publish({
            subject: 'resources.changed',
            data: { resourceId: 'resource-1' },
            headers: { 'x-request-id': 'request-1' },
            reply: 'resources.changed.reply',
        });

        expect(mockConnect).toHaveBeenCalledWith(
            expect.objectContaining({
                servers: ['nats://broker:4222'],
                name: 'api-service',
                timeout: 5000,
                maxReconnectAttempts: -1,
            }),
        );
        expect(service.getState()).toEqual({
            connected: true,
            server: 'nats://broker:4222',
            reconnectCount: 0,
        });
        expect(mockConnection.publish).toHaveBeenCalledWith(
            'resources.changed',
            Buffer.from(JSON.stringify({ resourceId: 'resource-1' })),
            expect.objectContaining({
                headers: expect.objectContaining({ values: { 'x-request-id': ['request-1'] } }),
                reply: 'resources.changed.reply',
            }),
        );
    });

    it('decodes request replies and converts response headers', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const response = await service.request({
            subject: 'resources.lookup',
            data: { resourceId: 'resource-1' },
            headers: { 'x-request-id': 'request-1' },
        });
        const data = await service.request$<{ status: string }>('resources.lookup', {
            resourceId: 'resource-1',
        });

        expect(response).toEqual({
            subject: 'resources.lookup.reply',
            sid: 3,
            data: Buffer.from(JSON.stringify({ status: 'ready' })),
            headers: { 'x-result': 'ok' },
            reply: undefined,
            timestamp: expect.any(Number),
        });
        expect(data).toEqual({ status: 'ready' });
        expect(mockConnection.request).toHaveBeenCalledWith(
            'resources.lookup',
            Buffer.from(JSON.stringify({ resourceId: 'resource-1' })),
            expect.objectContaining({
                timeout: 5000,
                headers: expect.objectContaining({ values: { 'x-request-id': ['request-1'] } }),
            }),
        );
    });

    it('creates subscriptions and closes managed resources', async () => {
        const subscription = createSubscription(12);
        mockConnection.subscribe.mockReturnValue(subscription);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const handleMessage = jest.fn();
        const result = await service.subscribe(
            {
                subject: 'resources.changed',
                queue: 'processors',
            },
            handleMessage,
        );

        expect(result).toMatchObject({
            sid: 12,
            subject: 'resources.changed',
            queue: 'processors',
        });
        expect(result.isCancelled()).toBe(false);
        expect(mockConnection.subscribe).toHaveBeenCalledWith('resources.changed', { queue: 'processors' });

        await service.onModuleDestroy();

        expect(subscription.unsubscribe).toHaveBeenCalled();
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('publishes to JetStream with encoded data and headers', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const ack = await service.jsPublish({
            stream: 'RESOURCE_EVENTS',
            subject: 'resources.changed',
            data: 'changed',
            headers: { 'x-request-id': 'request-1' },
        });

        expect(ack).toEqual({
            stream: 'RESOURCE_EVENTS',
            seq: 1,
            duplicate: false,
        });
        expect(mockConnection.jetstream).toHaveBeenCalled();
        expect(mockJetStream.publish).toHaveBeenCalledWith(
            'resources.changed',
            Buffer.from('changed'),
            expect.objectContaining({
                timeout: 5000,
                headers: expect.objectContaining({ values: { 'x-request-id': ['request-1'] } }),
            }),
        );
    });
});
