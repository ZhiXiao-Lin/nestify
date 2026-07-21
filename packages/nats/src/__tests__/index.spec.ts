import { NatsService, NatsServiceImpl } from '../index';
import { NatsModule } from '../nats.module';
import { MODULE_OPTIONS_TOKEN } from '../nats.module-definition';

const mockConnect = jest.fn();
const mockConsumerOpts = jest.fn();
const mockCreateInbox = jest.fn(() => '_INBOX.nestify');

jest.mock('nats', () => ({
    connect: (...args: unknown[]) => mockConnect(...args),
    consumerOpts: (...args: unknown[]) => mockConsumerOpts(...args),
    createInbox: () => mockCreateInbox(),
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

function createSubscription(id = 7, messages: unknown[] = [], iteratorError?: Error) {
    let closed = false;
    let resolveClosed!: () => void;
    const closedPromise = new Promise<void>(resolve => {
        resolveClosed = resolve;
    });

    return {
        getID: jest.fn(() => id),
        unsubscribe: jest.fn(() => {
            closed = true;
            resolveClosed();
        }),
        isClosed: jest.fn(() => closed),
        async *[Symbol.asyncIterator]() {
            for (const message of messages) {
                yield message;
            }
            if (iteratorError) {
                throw iteratorError;
            }
            if (!closed) {
                await closedPromise;
            }
        },
    };
}

function createJetStreamMessage() {
    return {
        subject: 'resources.changed',
        sid: 9,
        data: Buffer.from(JSON.stringify({ resourceId: 'resource-1' })),
        headers: createHeaders(),
        reply: undefined,
        ack: jest.fn(),
        nak: jest.fn(),
        term: jest.fn(),
        working: jest.fn(),
    };
}

function createConsumerOptions() {
    const options: Record<string, jest.Mock> = {};
    for (const method of [
        'ackAll',
        'ackExplicit',
        'ackNone',
        'ackWait',
        'bindStream',
        'deliverAll',
        'deliverLast',
        'deliverLastPerSubject',
        'deliverNew',
        'deliverTo',
        'durable',
        'filterSubject',
        'flowControl',
        'headersOnly',
        'idleHeartbeat',
        'limit',
        'manualAck',
        'maxAckPending',
        'maxDeliver',
        'maxMessages',
        'queue',
        'replayInstantly',
        'replayOriginal',
        'sample',
        'startSequence',
        'startTime',
    ]) {
        options[method] = jest.fn(() => options);
    }
    return options;
}

async function waitForCalls(mock: jest.Mock, expected = 1): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (mock.mock.calls.length >= expected) {
            return;
        }
        await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error(`Expected mock to be called ${expected} time(s), received ${mock.mock.calls.length}`);
}

describe('nats package', () => {
    let mockConnection: any;
    let mockJetStream: any;
    let mockConsumerOptions: ReturnType<typeof createConsumerOptions>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsumerOptions = createConsumerOptions();
        mockConsumerOpts.mockReturnValue(mockConsumerOptions);

        mockJetStream = {
            publish: jest.fn(async () => ({
                stream: 'RESOURCE_EVENTS',
                seq: 1,
                duplicate: false,
            })),
            subscribe: jest.fn(async () => createSubscription(9)),
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
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            jetstream: { domain: 'A3S', prefix: '$JS.A3S.API' },
        });

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
        expect(mockConnection.jetstream).toHaveBeenCalledWith({
            domain: 'A3S',
            apiPrefix: '$JS.A3S.API',
        });
        expect(mockJetStream.publish).toHaveBeenCalledWith(
            'resources.changed',
            Buffer.from('changed'),
            expect.objectContaining({
                timeout: 5000,
                headers: expect.objectContaining({ values: { 'x-request-id': ['request-1'] } }),
            }),
        );
    });

    it('fails explicitly when JetStream is disabled', async () => {
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            jetstream: { enabled: false },
        });

        await expect(service.getJetStream()).rejects.toThrow('JetStream is disabled by module configuration');
        expect(mockConnect).not.toHaveBeenCalled();
    });

    it('awaits the asynchronous JetStream subscription before registering it', async () => {
        const subscription = createSubscription(19);
        let resolveSubscription!: (value: ReturnType<typeof createSubscription>) => void;
        mockJetStream.subscribe.mockReturnValue(
            new Promise<ReturnType<typeof createSubscription>>(resolve => {
                resolveSubscription = resolve;
            }),
        );
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const pending = service.jsSubscribe(
            { stream: 'RESOURCE_EVENTS', subject: 'resources.changed' },
            async () => undefined,
        );
        await waitForCalls(mockJetStream.subscribe);

        expect(subscription.getID).not.toHaveBeenCalled();
        resolveSubscription(subscription);

        await expect(pending).resolves.toMatchObject({ sid: 19, subject: 'resources.changed' });
        expect(subscription.getID).toHaveBeenCalledTimes(1);
        expect(mockConsumerOptions.bindStream).toHaveBeenCalledWith('RESOURCE_EVENTS');
        expect(mockConsumerOptions.deliverTo).toHaveBeenCalledWith('_INBOX.nestify');
        expect(mockConsumerOptions.manualAck).toHaveBeenCalledTimes(1);
        expect(mockJetStream.subscribe).toHaveBeenCalledWith('resources.changed', mockConsumerOptions);
    });

    it('maps supported JetStream consumer configuration through the native builder', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const startTime = new Date('2026-01-02T03:04:05.000Z');

        const subscription = await service.jsSubscribe(
            {
                stream: 'RESOURCE_EVENTS',
                subject: 'resources.changed',
                durable: 'resource-workers',
                queue: 'workers',
                deliverSubject: 'deliver.resources.changed',
                config: {
                    deliverPolicy: 'by_start_time',
                    startTime,
                    ackPolicy: 'all',
                    ackWait: 30_000,
                    maxDeliver: 5,
                    maxAckPending: 100,
                    replayPolicy: 'original',
                    rateLimit: 1024,
                    samplingRate: 25,
                    headersOnly: true,
                    maxMessages: 500,
                    filterSubject: 'resources.changed.*',
                    idleHeartbeat: 5_000,
                    flowControl: true,
                },
            },
            async () => undefined,
        );

        expect(mockCreateInbox).not.toHaveBeenCalled();
        expect(mockConsumerOptions.deliverTo).toHaveBeenCalledWith('deliver.resources.changed');
        expect(mockConsumerOptions.durable).toHaveBeenCalledWith('resource-workers');
        expect(mockConsumerOptions.queue).toHaveBeenCalledWith('workers');
        expect(mockConsumerOptions.startTime).toHaveBeenCalledWith(startTime);
        expect(mockConsumerOptions.ackAll).toHaveBeenCalledTimes(1);
        expect(mockConsumerOptions.ackWait).toHaveBeenCalledWith(30_000);
        expect(mockConsumerOptions.maxDeliver).toHaveBeenCalledWith(5);
        expect(mockConsumerOptions.maxAckPending).toHaveBeenCalledWith(100);
        expect(mockConsumerOptions.replayOriginal).toHaveBeenCalledTimes(1);
        expect(mockConsumerOptions.limit).toHaveBeenCalledWith(1024);
        expect(mockConsumerOptions.sample).toHaveBeenCalledWith(25);
        expect(mockConsumerOptions.headersOnly).toHaveBeenCalledTimes(1);
        expect(mockConsumerOptions.maxMessages).toHaveBeenCalledWith(500);
        expect(mockConsumerOptions.filterSubject).toHaveBeenCalledWith('resources.changed.*');
        expect(mockConsumerOptions.idleHeartbeat).toHaveBeenCalledWith(5_000);
        expect(mockConsumerOptions.flowControl).toHaveBeenCalledTimes(1);

        subscription.cancel();
    });

    it('rejects conflicting JetStream start positions before subscribing', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(
            service.jsSubscribe(
                {
                    stream: 'RESOURCE_EVENTS',
                    subject: 'resources.changed',
                    config: {
                        startSeq: 10,
                        startTime: new Date('2026-01-02T03:04:05.000Z'),
                    },
                },
                async () => undefined,
            ),
        ).rejects.toMatchObject({ code: 'NATS_SUBSCRIBE_ERROR' });
        expect(mockJetStream.subscribe).not.toHaveBeenCalled();
    });

    it('automatically acknowledges a JetStream message only after successful handling', async () => {
        const message = createJetStreamMessage();
        mockJetStream.subscribe.mockResolvedValue(createSubscription(20, [message]));
        const handler = jest.fn(async () => undefined);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.jsSubscribe({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed' }, handler);
        await waitForCalls(handler);

        expect(message.ack).toHaveBeenCalledTimes(1);
        expect(message.nak).not.toHaveBeenCalled();
    });

    it('negatively acknowledges a failed JetStream message without acknowledging success', async () => {
        const message = createJetStreamMessage();
        mockJetStream.subscribe.mockResolvedValue(createSubscription(21, [message]));
        const handler = jest.fn(async () => {
            throw new Error('processing failed');
        });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.jsSubscribe({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed' }, handler);
        await waitForCalls(handler);
        await waitForCalls(message.nak);

        expect(message.ack).not.toHaveBeenCalled();
        expect(message.nak).toHaveBeenCalledTimes(1);
    });

    it('does not acknowledge messages when the consumer acknowledgement policy is none', async () => {
        const message = createJetStreamMessage();
        mockJetStream.subscribe.mockResolvedValue(createSubscription(26, [message]));
        const handler = jest.fn(async () => undefined);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.jsSubscribe(
            {
                stream: 'RESOURCE_EVENTS',
                subject: 'resources.changed',
                config: { ackPolicy: 'none' },
            },
            handler,
        );
        await waitForCalls(handler);

        expect(mockConsumerOptions.ackNone).toHaveBeenCalledTimes(1);
        expect(message.ack).not.toHaveBeenCalled();
        expect(message.nak).not.toHaveBeenCalled();
    });

    it('exposes manual JetStream acknowledgement controls without auto-acknowledging', async () => {
        const sourceMessage = createJetStreamMessage();
        mockJetStream.subscribe.mockResolvedValue(createSubscription(22, [sourceMessage]));
        const handler = jest.fn(async () => undefined);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.jsSubscribe(
            { stream: 'RESOURCE_EVENTS', subject: 'resources.changed', manualAck: true },
            handler,
        );
        await waitForCalls(handler);

        const message = handler.mock.calls[0][0];
        expect(message).toEqual(
            expect.objectContaining({
                ack: expect.any(Function),
                nak: expect.any(Function),
                term: expect.any(Function),
                inProgress: expect.any(Function),
            }),
        );
        expect(sourceMessage.ack).not.toHaveBeenCalled();

        message.inProgress();
        message.nak(250);
        message.term('poison message');
        message.ack();

        expect(sourceMessage.working).toHaveBeenCalledTimes(1);
        expect(sourceMessage.nak).toHaveBeenCalledWith(250);
        expect(sourceMessage.term).toHaveBeenCalledWith('poison message');
        expect(sourceMessage.ack).toHaveBeenCalledTimes(1);
    });

    it('contains asynchronous subscription iterator failures and closes the subscription', async () => {
        const subscription = createSubscription(23, [], new Error('consumer iterator failed'));
        mockJetStream.subscribe.mockResolvedValue(subscription);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

        await service.jsSubscribe({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed' }, async () => undefined);
        await waitForCalls(logError);

        expect(logError).toHaveBeenCalledWith('Subscription on resources.changed stopped: consumer iterator failed');
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('waits for an in-flight handler to acknowledge before closing the connection', async () => {
        const message = createJetStreamMessage();
        const subscription = createSubscription(24, [message]);
        mockJetStream.subscribe.mockResolvedValue(subscription);
        let releaseHandler!: () => void;
        const handler = jest.fn(
            () =>
                new Promise<void>(resolve => {
                    releaseHandler = resolve;
                }),
        );
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.jsSubscribe({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed' }, handler);
        await waitForCalls(handler);

        const shutdown = service.onModuleDestroy();
        await new Promise<void>(resolve => setImmediate(resolve));
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(mockConnection.close).not.toHaveBeenCalled();

        releaseHandler();
        await shutdown;

        expect(message.ack).toHaveBeenCalledTimes(1);
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
        expect(message.ack.mock.invocationCallOrder[0]).toBeLessThan(mockConnection.close.mock.invocationCallOrder[0]);
    });

    it('waits for a pending JetStream subscription and cleans up its late result during shutdown', async () => {
        const subscription = createSubscription(25);
        let resolveSubscription!: (value: ReturnType<typeof createSubscription>) => void;
        mockJetStream.subscribe.mockReturnValue(
            new Promise<ReturnType<typeof createSubscription>>(resolve => {
                resolveSubscription = resolve;
            }),
        );
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const pending = service.jsSubscribe(
            { stream: 'RESOURCE_EVENTS', subject: 'resources.changed' },
            async () => undefined,
        );
        await waitForCalls(mockJetStream.subscribe);

        const shutdown = service.onModuleDestroy();
        await new Promise<void>(resolve => setImmediate(resolve));
        expect(mockConnection.close).not.toHaveBeenCalled();

        resolveSubscription(subscription);
        await expect(pending).rejects.toMatchObject({ code: 'NATS_SUBSCRIBE_ERROR' });
        await shutdown;

        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
    });
});
