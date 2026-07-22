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
    RequestStrategy: {
        Timer: 'timer',
        Count: 'count',
        JitterTimer: 'jitterTimer',
        SentinelMsg: 'sentinelMsg',
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

    const subscription = {
        getID: jest.fn(() => id),
        unsubscribe: jest.fn(() => {
            closed = true;
            resolveClosed();
        }),
        drain: jest.fn(async () => {
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
    return subscription;
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

async function waitForCondition(condition: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (condition()) {
            return;
        }
        await new Promise<void>(resolve => setImmediate(resolve));
    }
    throw new Error('Expected condition to become true');
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

        let connectionClosed = false;
        let connectionDraining = false;
        let resolveConnectionClosed!: () => void;
        const connectionClosedPromise = new Promise<void>(resolve => {
            resolveConnectionClosed = resolve;
        });
        const finishConnectionClose = () => {
            connectionClosed = true;
            connectionDraining = false;
            resolveConnectionClosed();
        };

        mockConnection = {
            getServer: jest.fn(() => 'nats://broker:4222'),
            closed: jest.fn(() => connectionClosedPromise),
            close: jest.fn(async () => finishConnectionClose()),
            drain: jest.fn(async () => {
                connectionDraining = true;
                finishConnectionClose();
            }),
            isClosed: jest.fn(() => connectionClosed),
            isDraining: jest.fn(() => connectionDraining),
            status: jest.fn(async function* () {}),
            flush: jest.fn(async () => undefined),
            stats: jest.fn(() => ({
                inBytes: 1,
                outBytes: 2,
                inMsgs: 3,
                outMsgs: 4,
            })),
            jetstream: jest.fn(() => mockJetStream),
            publish: jest.fn(),
            request: jest.fn(async () => ({
                subject: 'resources.lookup.reply',
                sid: 3,
                data: Buffer.from(JSON.stringify({ status: 'ready' })),
                headers: createHeaders({ 'x-result': ['ok'] }),
                reply: undefined,
                respond: jest.fn(() => false),
            })),
            requestMany: jest.fn(async () =>
                (async function* () {
                    yield {
                        subject: 'resources.lookup.reply',
                        sid: 4,
                        data: Buffer.from(JSON.stringify({ status: 'ready' })),
                        headers: createHeaders(),
                        reply: undefined,
                        respond: jest.fn(() => false),
                    };
                })(),
            ),
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
            respond: expect.any(Function),
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

        expect(subscription.drain).toHaveBeenCalled();
        expect(subscription.unsubscribe).not.toHaveBeenCalled();
        expect(mockConnection.drain).toHaveBeenCalled();
        expect(mockConnection.close).not.toHaveBeenCalled();
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
        expect(subscription.drain).not.toHaveBeenCalled();
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
        expect(subscription.drain).toHaveBeenCalledTimes(1);
        expect(subscription.unsubscribe).not.toHaveBeenCalled();
        expect(mockConnection.drain).not.toHaveBeenCalled();

        releaseHandler();
        await shutdown;

        expect(message.ack).toHaveBeenCalledTimes(1);
        expect(mockConnection.drain).toHaveBeenCalledTimes(1);
        expect(message.ack.mock.invocationCallOrder[0]).toBeLessThan(mockConnection.drain.mock.invocationCallOrder[0]);
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
        expect(mockConnection.drain).not.toHaveBeenCalled();

        resolveSubscription(subscription);
        await expect(pending).rejects.toMatchObject({ code: 'NATS_SERVICE_CLOSED' });
        await shutdown;

        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(subscription.drain).not.toHaveBeenCalled();
        expect(mockConnection.drain).toHaveBeenCalledTimes(1);
    });

    it('normalizes string servers, nested authentication, and Node TLS verification options', async () => {
        const service = new NatsServiceImpl({
            servers: ' nats://secure-broker:4222 ',
            auth: { user: 'service-user', pass: 'service-password' },
            tls: {
                cert: 'client-certificate',
                key: 'client-key',
                ca: 'root-certificate',
                verify: false,
                handshakeFirst: true,
            },
        });

        await service.onModuleInit();

        expect(mockConnect).toHaveBeenCalledWith(
            expect.objectContaining({
                servers: ['nats://secure-broker:4222'],
                user: 'service-user',
                pass: 'service-password',
                token: undefined,
                tls: {
                    cert: 'client-certificate',
                    key: 'client-key',
                    ca: 'root-certificate',
                    handshakeFirst: true,
                    rejectUnauthorized: false,
                },
            }),
        );

        await service.close();
    });

    it.each([
        [{ servers: [] }, 'servers must contain at least one server'],
        [{ servers: ['nats://broker:4222'], token: 'token', user: 'user', pass: 'pass' }, 'mutually exclusive'],
        [{ servers: ['nats://broker:4222'], auth: { user: 'user' } }, 'configured together'],
        [{ servers: ['nats://broker:4222'], shutdownTimeoutMs: 0 }, 'positive integer'],
        [
            {
                servers: ['nats://broker:4222'],
                tls: { cert: 'certificate', key: 'key', verify: true, rejectUnauthorized: false },
            },
            'must agree',
        ],
    ])('rejects invalid module configuration %#', (options, message) => {
        expect(() => new NatsServiceImpl(options as any)).toThrow(message as string);
        try {
            new NatsServiceImpl(options as any);
        } catch (error) {
            expect(error).toMatchObject({ code: 'NATS_CONFIGURATION_ERROR' });
        }
    });

    it('coalesces concurrent connection attempts and reuses the same connection', async () => {
        let resolveConnection!: (connection: typeof mockConnection) => void;
        mockConnect.mockReturnValueOnce(
            new Promise(resolve => {
                resolveConnection = resolve;
            }),
        );
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const first = service.getConnection();
        const second = service.getConnection();
        expect(mockConnect).toHaveBeenCalledTimes(1);

        resolveConnection(mockConnection);
        await expect(first).resolves.toBe(mockConnection);
        await expect(second).resolves.toBe(mockConnection);
        await expect(service.getConnection()).resolves.toBe(mockConnection);
        expect(mockConnect).toHaveBeenCalledTimes(1);

        await service.close();
    });

    it('rejects a connection that closes before callers can use it', async () => {
        const closedConnection = {
            ...mockConnection,
            closed: jest.fn(async () => undefined),
            isClosed: jest.fn(() => true),
            status: jest.fn(async function* () {}),
        };
        mockConnect.mockResolvedValueOnce(closedConnection);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(service.getConnection()).rejects.toMatchObject({
            code: 'NATS_CONNECTION_ERROR',
            message: expect.stringContaining('closed before it became ready'),
        });
        expect(service.getState().connected).toBe(false);
    });

    it('recovers after an unusable connection instead of returning the stale client', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const first = await service.getConnection();
        first.isClosed = jest.fn(() => true);

        const replacement = {
            ...mockConnection,
            getServer: jest.fn(() => 'nats://replacement:4222'),
            isClosed: jest.fn(() => false),
            isDraining: jest.fn(() => false),
            closed: jest.fn(() => new Promise<never>(() => undefined)),
            status: jest.fn(async function* () {}),
        };
        mockConnect.mockResolvedValueOnce(replacement);

        await expect(service.getConnection()).resolves.toBe(replacement);
        expect(mockConnect).toHaveBeenCalledTimes(2);
        expect(service.getState().server).toBe('nats://replacement:4222');
    });

    it('preserves connection error causes and permits a later retry', async () => {
        const rootCause = new Error('broker unavailable');
        mockConnect.mockRejectedValueOnce(rootCause);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(service.onModuleInit()).rejects.toMatchObject({
            code: 'NATS_CONNECTION_ERROR',
            cause: rootCause,
        });
        await expect(service.getConnection()).resolves.toBe(mockConnection);
        expect(mockConnect).toHaveBeenCalledTimes(2);

        await service.close();
    });

    it('probes the connection, exposes native statistics, and reports health timeouts', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        await service.onModuleInit();

        await expect(service.healthCheck(50)).resolves.toMatchObject({
            healthy: true,
            server: 'nats://broker:4222',
            latencyMs: expect.any(Number),
        });
        await expect(service.getStats()).resolves.toEqual({ inBytes: 1, outBytes: 2, inMsgs: 3, outMsgs: 4 });

        mockConnection.flush.mockReturnValueOnce(new Promise<never>(() => undefined));
        await expect(service.healthCheck(5)).resolves.toMatchObject({
            healthy: false,
            error: 'NATS health check timed out after 5ms',
        });

        await service.close();
    });

    it('collects multiple request responses with an explicit count strategy', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'], requestTimeoutMs: 2500 });

        await expect(
            service.requestMany({
                subject: 'resources.lookup',
                data: { resourceId: 'resource-1' },
                expectedResponseCount: 2,
                headers: { 'x-request-id': 'request-1' },
            }),
        ).resolves.toEqual([
            expect.objectContaining({
                subject: 'resources.lookup.reply',
                data: Buffer.from(JSON.stringify({ status: 'ready' })),
                respond: expect.any(Function),
            }),
        ]);
        expect(mockConnection.requestMany).toHaveBeenCalledWith(
            'resources.lookup',
            Buffer.from(JSON.stringify({ resourceId: 'resource-1' })),
            expect.objectContaining({
                strategy: 'count',
                maxWait: 2500,
                maxMessages: 2,
                headers: expect.objectContaining({ values: { 'x-request-id': ['request-1'] } }),
            }),
        );
    });

    it('exposes encoded request/reply responses on converted messages', async () => {
        const respond = jest.fn(() => true);
        mockConnection.request.mockResolvedValueOnce({
            subject: 'resources.lookup.reply',
            sid: 30,
            data: Buffer.from('request'),
            headers: createHeaders(),
            reply: 'resources.response',
            respond,
        });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const response = await service.request({ subject: 'resources.lookup' });
        expect(response.respond({ accepted: true }, { 'x-result': 'ok' })).toBe(true);
        expect(respond).toHaveBeenCalledWith(
            Buffer.from(JSON.stringify({ accepted: true })),
            expect.objectContaining({
                headers: expect.objectContaining({ values: { 'x-result': ['ok'] } }),
            }),
        );
    });

    it('passes core subscription limits and enforces subscription handle ownership', async () => {
        const nativeSubscription = createSubscription(31);
        mockConnection.subscribe.mockReturnValueOnce(nativeSubscription);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const subscription = await service.subscribe(
            { subject: 'resources.changed', queue: 'workers', maxMessages: 2, timeout: 500 },
            async () => undefined,
        );
        expect(mockConnection.subscribe).toHaveBeenCalledWith('resources.changed', {
            queue: 'workers',
            max: 2,
            timeout: 500,
        });
        expect(() =>
            service.unsubscribe({
                sid: 31,
                subject: 'resources.changed',
                closed: Promise.resolve(),
                cancel: () => undefined,
                drain: async () => undefined,
                isCancelled: () => false,
            }),
        ).toThrow(expect.objectContaining({ code: 'NATS_SUBSCRIPTION_OWNERSHIP_ERROR' }));

        subscription.cancel();
        subscription.cancel();
        await subscription.closed;
        expect(nativeSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(() => service.unsubscribe(subscription)).not.toThrow();

        await service.close();
    });

    it('drains a subscription and resolves its completion promise', async () => {
        const nativeSubscription = createSubscription(32);
        mockConnection.subscribe.mockReturnValueOnce(nativeSubscription);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        const subscription = await service.subscribe({ subject: 'resources.changed' }, async () => undefined);
        await subscription.drain();

        expect(nativeSubscription.drain).toHaveBeenCalledTimes(1);
        await expect(subscription.closed).resolves.toBeUndefined();
        await service.close();
    });

    it('falls back to close when draining fails and keeps shutdown idempotent', async () => {
        mockConnection.drain.mockRejectedValueOnce(new Error('drain failed'));
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        await service.onModuleInit();

        const first = service.close();
        const second = service.close();
        expect(second).toBe(first);
        await first;

        expect(mockConnection.drain).toHaveBeenCalledTimes(1);
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
        await expect(service.publish({ subject: 'resources.changed' })).rejects.toMatchObject({
            code: 'NATS_SERVICE_CLOSED',
        });
    });

    it('supports an explicit immediate-close shutdown policy', async () => {
        const nativeSubscription = createSubscription(34);
        mockConnection.subscribe.mockReturnValueOnce(nativeSubscription);
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            drainOnShutdown: false,
        });
        await service.subscribe({ subject: 'resources.changed' }, async () => undefined);

        await service.close();

        expect(nativeSubscription.drain).not.toHaveBeenCalled();
        expect(nativeSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(mockConnection.drain).not.toHaveBeenCalled();
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
    });

    it('bounds shutdown when a subscription handler never settles', async () => {
        const subscription = createSubscription(33, [createJetStreamMessage()]);
        mockJetStream.subscribe.mockResolvedValueOnce(subscription);
        const handler = jest.fn(() => new Promise<never>(() => undefined));
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            shutdownTimeoutMs: 15,
        });

        await service.jsSubscribe({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed' }, handler);
        await waitForCalls(handler);
        const startedAt = Date.now();
        await service.close();

        expect(Date.now() - startedAt).toBeLessThan(250);
        expect(subscription.drain).toHaveBeenCalledTimes(1);
        expect(subscription.unsubscribe).not.toHaveBeenCalled();
        expect(mockConnection.drain).toHaveBeenCalledTimes(1);
    });

    it('returns from bounded shutdown and closes a connection that resolves late', async () => {
        let resolveConnection!: (connection: typeof mockConnection) => void;
        mockConnect.mockReturnValueOnce(
            new Promise(resolve => {
                resolveConnection = resolve;
            }),
        );
        const service = new NatsServiceImpl({
            servers: ['nats://broker:4222'],
            shutdownTimeoutMs: 10,
        });

        const pendingConnection = service.getConnection();
        await waitForCalls(mockConnect);
        const startedAt = Date.now();
        await service.close();
        expect(Date.now() - startedAt).toBeLessThan(250);

        resolveConnection(mockConnection);
        await expect(pendingConnection).rejects.toMatchObject({ code: 'NATS_SERVICE_CLOSED' });
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid JetStream consumer values before opening a connection', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(
            service.jsSubscribe(
                {
                    stream: 'RESOURCE_EVENTS',
                    subject: 'resources.changed',
                    config: { samplingRate: 101 },
                },
                async () => undefined,
            ),
        ).rejects.toMatchObject({ code: 'NATS_SUBSCRIBE_ERROR' });
        expect(mockConnect).not.toHaveBeenCalled();
    });

    it('rejects a JetStream acknowledgement from an unexpected stream', async () => {
        mockJetStream.publish.mockResolvedValueOnce({ stream: 'OTHER_STREAM', seq: 1, duplicate: false });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(
            service.jsPublish({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed', data: 'changed' }),
        ).rejects.toMatchObject({ code: 'NATS_PUBLISH_ERROR' });
    });

    it('tracks disconnect, error, and reconnect status events from the active connection', async () => {
        mockConnection.getServer.mockReturnValue('nats://reconnected:4222');
        mockConnection.status.mockImplementation(async function* () {
            yield { type: 'disconnect', data: 'nats://broker:4222' };
            yield { type: 'error', data: 'permissions violation' };
            yield { type: 'reconnect', data: 'nats://reconnected:4222' };
        });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.onModuleInit();
        await waitForCondition(() => service.getState().reconnectCount === 1);

        expect(service.getState()).toEqual({
            connected: true,
            server: 'nats://reconnected:4222',
            reconnectCount: 1,
            lastError: 'permissions violation',
        });
        await service.close();
    });

    it('clears the active client and records an unexpected close error', async () => {
        let resolveClosed!: (error: Error) => void;
        mockConnection.closed.mockReturnValueOnce(
            new Promise(resolve => {
                resolveClosed = resolve;
            }),
        );
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        await service.onModuleInit();

        resolveClosed(new Error('connection lost'));
        await waitForCondition(() => service.getState().connected === false);

        expect(service.getState().lastError).toBe('connection lost');
        await expect(service.healthCheck()).resolves.toMatchObject({
            healthy: false,
            error: 'NATS connection is not active',
        });
        await service.close();
    });

    it('closes a partially initialized connection when JetStream construction fails', async () => {
        mockConnection.jetstream.mockImplementationOnce(() => {
            throw new Error('JetStream setup failed');
        });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(service.onModuleInit()).rejects.toMatchObject({
            code: 'NATS_CONNECTION_ERROR',
            cause: expect.objectContaining({ message: 'JetStream setup failed' }),
        });
        expect(mockConnection.close).toHaveBeenCalledTimes(1);
        expect(service.getState()).toMatchObject({ connected: false, lastError: 'JetStream setup failed' });
    });

    it('wraps flush timeout and rejection failures with the underlying cause', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        await service.onModuleInit();

        mockConnection.flush.mockReturnValueOnce(new Promise<never>(() => undefined));
        await expect(service.flush(5)).rejects.toMatchObject({
            code: 'NATS_CONNECTION_ERROR',
            message: expect.stringContaining('flush timed out after 5ms'),
        });

        const rootCause = new Error('flush failed');
        mockConnection.flush.mockRejectedValueOnce(rootCause);
        await expect(service.flush(50)).rejects.toMatchObject({
            code: 'NATS_CONNECTION_ERROR',
            cause: rootCause,
        });
        await service.close();
    });

    it('wraps publish and request validation or transport failures without losing causes', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await expect(service.publish({ subject: '' })).rejects.toMatchObject({
            code: 'NATS_PUBLISH_ERROR',
            cause: expect.any(TypeError),
        });
        mockConnection.publish.mockImplementationOnce(() => {
            throw new Error('publish failed');
        });
        await expect(service.pubsub('resources.changed', new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
            code: 'NATS_PUBLISH_ERROR',
            cause: expect.objectContaining({ message: 'publish failed' }),
        });
        await expect(service.request({ subject: 'resources.lookup', expectedResponseCount: 2 })).rejects.toMatchObject({
            code: 'NATS_REQUEST_ERROR',
        });
        const requestCause = new Error('request failed');
        mockConnection.request.mockRejectedValueOnce(requestCause);
        await expect(service.request({ subject: 'resources.lookup' })).rejects.toMatchObject({
            code: 'NATS_REQUEST_ERROR',
            cause: requestCause,
        });
    });

    it('uses the publish timeout as an explicit server flush deadline', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.publish({ subject: 'resources.changed', data: 'changed', timeout: 50 });
        expect(mockConnection.flush).toHaveBeenCalledTimes(1);

        mockConnection.flush.mockReturnValueOnce(new Promise<never>(() => undefined));
        await expect(service.publish({ subject: 'resources.changed', timeout: 5 })).rejects.toMatchObject({
            code: 'NATS_PUBLISH_ERROR',
            message: expect.stringContaining('publish flush timed out after 5ms'),
        });
    });

    it('maps timer, jitter, and sentinel multi-response strategies', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.requestMany({ subject: 'resources.lookup', strategy: 'timer', maxWait: 100 });
        await service.requestMany({ subject: 'resources.lookup', strategy: 'jitter', jitter: 25, maxWait: 100 });
        await service.requestMany({ subject: 'resources.lookup', strategy: 'sentinel', maxWait: 100 });

        expect(mockConnection.requestMany.mock.calls.map((call: unknown[]) => call[2])).toEqual([
            expect.objectContaining({ strategy: 'timer', maxWait: 100 }),
            expect.objectContaining({ strategy: 'jitterTimer', jitter: 25, maxWait: 100 }),
            expect.objectContaining({ strategy: 'sentinelMsg', maxWait: 100 }),
        ]);
    });

    it('maps dedicated request subscriptions and validates their reply subjects', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });

        await service.request({
            subject: 'resources.lookup',
            noMux: true,
            reply: '_INBOX.resources.lookup',
        });
        expect(mockConnection.request).toHaveBeenCalledWith(
            'resources.lookup',
            expect.any(Uint8Array),
            expect.objectContaining({ noMux: true, reply: '_INBOX.resources.lookup' }),
        );

        await service.requestMany({ subject: 'resources.lookup', strategy: 'timer', noMux: true });
        expect(mockConnection.requestMany).toHaveBeenCalledWith(
            'resources.lookup',
            expect.any(Uint8Array),
            expect.objectContaining({ noMux: true }),
        );

        await expect(service.request({ subject: 'resources.lookup', noMux: true })).rejects.toMatchObject({
            code: 'NATS_REQUEST_ERROR',
        });
        await expect(
            service.request({ subject: 'resources.lookup', reply: '_INBOX.resources.lookup' }),
        ).rejects.toMatchObject({ code: 'NATS_REQUEST_ERROR' });
    });

    it.each([
        [{ subject: 'resources.lookup', strategy: 'count' }, 'expectedResponseCount'],
        [
            { subject: 'resources.lookup', strategy: 'timer', expectedResponseCount: 2 },
            'only be used with the count strategy',
        ],
        [{ subject: 'resources.lookup', strategy: 'timer', jitter: 5 }, 'only be used with the jitter strategy'],
        [{ subject: 'resources.lookup', strategy: 'unknown' }, 'Unsupported request strategy'],
        [{ subject: 'resources.lookup', maxWait: 0 }, 'maxWait must be a positive integer'],
    ])('rejects invalid multi-response options %#', async (options, message) => {
        await expect(new NatsServiceImpl({}).requestMany(options as any)).rejects.toMatchObject({
            code: 'NATS_REQUEST_ERROR',
            message: expect.stringContaining(message as string),
        });
    });

    it('maps every JetStream delivery and acknowledgement policy branch', async () => {
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const startTime = new Date('2026-02-03T04:05:06.000Z');
        const configs = [
            { deliverPolicy: 'all', ackPolicy: 'explicit', replayPolicy: 'instant' },
            { deliverPolicy: 'last' },
            { deliverPolicy: 'new' },
            { deliverPolicy: 'last_per_subject' },
            { deliverPolicy: 'by_start_sequence', startSeq: 12 },
            { startSeq: 13 },
            { startTime },
        ] as const;

        for (let index = 0; index < configs.length; index += 1) {
            mockJetStream.subscribe.mockResolvedValueOnce(createSubscription(40 + index));
            const subscription = await service.jsSubscribe(
                { stream: 'RESOURCE_EVENTS', subject: 'resources.changed', config: configs[index] },
                async () => undefined,
            );
            subscription.cancel();
            await subscription.closed;
        }

        expect(mockConsumerOptions.deliverAll).toHaveBeenCalled();
        expect(mockConsumerOptions.deliverLast).toHaveBeenCalled();
        expect(mockConsumerOptions.deliverNew).toHaveBeenCalled();
        expect(mockConsumerOptions.deliverLastPerSubject).toHaveBeenCalled();
        expect(mockConsumerOptions.startSequence).toHaveBeenCalledWith(12);
        expect(mockConsumerOptions.startSequence).toHaveBeenCalledWith(13);
        expect(mockConsumerOptions.startTime).toHaveBeenCalledWith(startTime);
        expect(mockConsumerOptions.ackExplicit).toHaveBeenCalled();
        expect(mockConsumerOptions.replayInstantly).toHaveBeenCalled();
        await service.close();
    });

    it('contains ordinary subscription handler failures and supports service-owned unsubscribe', async () => {
        const message = {
            subject: 'resources.changed',
            sid: 51,
            data: Buffer.from('not-json'),
            headers: createHeaders(),
            reply: undefined,
            respond: jest.fn(() => false),
        };
        const nativeSubscription = createSubscription(51, [message]);
        mockConnection.subscribe.mockReturnValueOnce(nativeSubscription);
        const handler = jest.fn(async () => {
            throw new Error('handler failed');
        });
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

        const subscription = await service.subscribe$('resources.changed', handler);
        await waitForCalls(handler);
        await waitForCalls(logError);
        service.unsubscribe(subscription);
        await subscription.closed;

        expect(handler).toHaveBeenCalledWith('not-json');
        expect(nativeSubscription.unsubscribe).toHaveBeenCalledTimes(1);
        await subscription.drain();
        await service.close();
    });

    it('rejects duplicate native subscription identifiers and contains acknowledgement failures', async () => {
        const firstNative = createSubscription(60);
        const duplicateNative = createSubscription(60);
        mockConnection.subscribe.mockReturnValueOnce(firstNative).mockReturnValueOnce(duplicateNative);
        const service = new NatsServiceImpl({ servers: ['nats://broker:4222'] });
        const first = await service.subscribe({ subject: 'resources.first' }, async () => undefined);

        await expect(service.subscribe({ subject: 'resources.second' }, async () => undefined)).rejects.toMatchObject({
            code: 'NATS_SUBSCRIBE_ERROR',
        });
        expect(duplicateNative.unsubscribe).toHaveBeenCalledTimes(1);
        first.cancel();
        await first.closed;

        const message = createJetStreamMessage();
        message.ack.mockImplementationOnce(() => {
            throw new Error('ack failed');
        });
        mockJetStream.subscribe.mockResolvedValueOnce(createSubscription(61, [message]));
        const logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
        const subscription = await service.jsSubscribe(
            { stream: 'RESOURCE_EVENTS', subject: 'resources.changed' },
            async () => undefined,
        );
        await waitForCalls(message.ack);
        expect(logError).toHaveBeenCalledWith('Failed to acknowledge message on resources.changed: ack failed');
        subscription.cancel();
        await subscription.closed;
        await service.close();
    });
});
