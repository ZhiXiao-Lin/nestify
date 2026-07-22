import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    type ConnectionOptions,
    type ConsumerOptsBuilder,
    connect,
    consumerOpts,
    createInbox,
    headers as createNatsHeaders,
    Events,
    type JetStreamClient,
    type JsMsg,
    type Msg,
    type MsgHdrs,
    type NatsConnection,
    type Subscription as NatsSubscription,
    type PubAck,
    RequestStrategy,
    type Stats,
    StringCodec,
} from 'nats';
import { MODULE_OPTIONS_TOKEN } from './nats.module-definition';
import type {
    JetStreamMessage,
    JetStreamPublishOptions,
    JetStreamSubscribeOptions,
    JetStreamSubscriptionHandler,
    NatsConnectionState,
    NatsHealthResult,
    NatsMessage,
    NatsPackageOptions,
    PublishOptions,
    RequestManyOptions,
    RequestOptions,
    StreamSubscriptionConfig,
    SubscribeOptions,
    SubscriptionHandler,
} from './nats.types';
import {
    NatsConnectionError,
    NatsJetStreamDisabledError,
    NatsPublishError,
    NatsRequestError,
    NatsServiceClosedError,
    NatsSubscribeError,
    NatsSubscriptionOwnershipError,
} from './nats.types';
import {
    type NormalizedNatsPackageOptions,
    normalizeNatsPackageOptions,
    toNatsConnectionOptions,
} from './nats-options';

interface SubscriptionRecord {
    native: SubscriptionLifecycle;
    handle: Subscription;
}

type SettleResult<T> =
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: unknown }
    | { status: 'timeout' };

// Local type for subscription return values (not an interface - no implementation contract)
export interface Subscription {
    sid: number;
    subject: string;
    queue?: string;
    /** Resolves after the subscription iterator and any active handler finish. */
    closed: Promise<void>;
    cancel(): void;
    /** Gracefully process messages already received by the client, then close. */
    drain(): Promise<void>;
    isCancelled(): boolean;
}

type SubscriptionLifecycle = Pick<NatsSubscription, 'drain' | 'getID' | 'isClosed' | 'unsubscribe'>;

@Injectable()
export class NatsServiceImpl implements OnModuleInit, OnModuleDestroy {
    private connection: NatsConnection | null = null;
    private jetStream: JetStreamClient | null = null;
    private readonly subscriptions = new Map<number, SubscriptionLifecycle>();
    private readonly subscriptionRecords = new Map<number, SubscriptionRecord>();
    private readonly ownedSubscriptions = new WeakSet<Subscription>();
    private readonly subscriptionTasks = new Map<number, Promise<void>>();
    private readonly pendingSubscriptionSetups = new Set<Promise<Subscription>>();
    private readonly inFlightOperations = new Set<Promise<unknown>>();
    private readonly connectionTasks = new Set<Promise<void>>();
    private connectionState: NatsConnectionState;
    private connectionPromise: Promise<NatsConnection> | null = null;
    private disconnectPromise: Promise<void> | null = null;
    private shuttingDown = false;
    private readonly logger = new Logger(NatsServiceImpl.name);
    private readonly stringCodec = StringCodec();
    private readonly options: NormalizedNatsPackageOptions;
    private readonly connectionOptions: ConnectionOptions;

    constructor(@Inject(MODULE_OPTIONS_TOKEN) options: NatsPackageOptions) {
        this.options = normalizeNatsPackageOptions(options);
        this.connectionOptions = toNatsConnectionOptions(this.options);
        this.connectionState = {
            connected: false,
            server: '',
            reconnectCount: 0,
        };
    }

    async onModuleInit(): Promise<void> {
        await this.getConnection();
    }

    async onModuleDestroy(): Promise<void> {
        await this.close();
    }

    // =========================================================================
    // Connection Management
    // =========================================================================

    private async openConnection(): Promise<NatsConnection> {
        let openedConnection: NatsConnection | null = null;
        try {
            this.assertRunning();
            const connection = await connect(this.connectionOptions);
            openedConnection = connection;

            if (this.shuttingDown) {
                await this.closeLateConnection(connection);
                throw new NatsServiceClosedError();
            }

            this.connection = connection;

            this.connectionState = {
                connected: true,
                server: connection.getServer(),
                reconnectCount: 0,
            };

            this.trackConnectionTask(this.observeConnectionClose(connection));
            this.trackConnectionTask(this.monitorStatus(connection));

            if (this.options.jetstream?.enabled !== false) {
                this.jetStream = connection.jetstream(this.getJetStreamOptions());
            }

            this.logger.log(`Connected to NATS at ${this.connectionState.server}`);
            return connection;
        } catch (error) {
            if (openedConnection && this.connection === openedConnection) {
                this.connection = null;
                this.jetStream = null;
                await this.closeLateConnection(openedConnection);
            }

            const message = this.errorMessage(error);
            this.connectionState.lastError = message;
            this.connectionState.connected = false;
            if (error instanceof NatsServiceClosedError) {
                throw error;
            }
            throw new NatsConnectionError(this.options.servers.join(', '), message, error);
        }
    }

    close(): Promise<void> {
        this.shuttingDown = true;
        this.disconnectPromise ??= this.performDisconnect();
        return this.disconnectPromise;
    }

    private async performDisconnect(): Promise<void> {
        const deadline = Date.now() + this.options.shutdownTimeoutMs;

        if (this.options.drainOnShutdown) {
            await this.drainSubscriptions(deadline);
        }
        this.unsubscribeAll();
        await this.awaitTasks([...this.pendingSubscriptionSetups], deadline, 'pending subscription setup');
        await this.awaitTasks([...this.inFlightOperations], deadline, 'in-flight operation');
        if (this.connectionPromise) {
            await this.awaitTasks([this.connectionPromise], deadline, 'pending connection');
        }
        this.unsubscribeAll();
        await this.awaitTasks([...this.subscriptionTasks.values()], deadline, 'subscription handler');

        const connection = this.connection;
        this.connection = null;
        this.jetStream = null;
        this.connectionState.connected = false;

        if (!connection) {
            await this.awaitTasks([...this.connectionTasks], deadline, 'connection monitor');
            return;
        }

        let drained = false;
        if (this.options.drainOnShutdown) {
            const drainResult = await settleWithin(
                this.invoke(() => connection.drain()),
                remainingMs(deadline),
            );
            if (drainResult.status === 'fulfilled') {
                drained = true;
                this.logger.log('NATS connection drained and closed');
            } else {
                this.logSettlementFailure('draining NATS connection', drainResult);
            }
        }

        if (!drained) {
            const closeResult = await settleWithin(
                this.invoke(() => connection.close()),
                remainingMs(deadline),
            );
            if (closeResult.status === 'fulfilled') {
                this.logger.log('NATS connection closed');
            } else {
                this.logSettlementFailure('closing NATS connection', closeResult);
            }
        }

        await this.awaitTasks([...this.connectionTasks], deadline, 'connection monitor');
    }

    private async drainSubscriptions(deadline: number): Promise<void> {
        const drains = [...this.subscriptions].map(async ([sid, subscription]) => {
            try {
                if (!subscription.isClosed()) {
                    await subscription.drain();
                }
            } catch (error) {
                this.logger.error(`Error draining NATS subscription ${sid}: ${this.errorMessage(error)}`);
            }
        });
        await this.awaitTasks(drains, deadline, 'subscription drain');
    }

    async getConnection(): Promise<NatsConnection> {
        this.assertRunning();
        if (this.connection && this.isConnectionUsable(this.connection)) {
            return this.connection;
        }

        this.connection = null;
        this.jetStream = null;

        const pending = this.connectionPromise ?? this.openConnection();
        this.connectionPromise = pending;
        try {
            const connection = await pending;
            this.assertRunning();
            if (!this.isConnectionUsable(connection)) {
                if (this.connection === connection) {
                    this.connection = null;
                    this.jetStream = null;
                }
                throw new NatsConnectionError(connection.getServer(), 'Connection closed before it became ready');
            }
            return connection;
        } finally {
            if (this.connectionPromise === pending) {
                this.connectionPromise = null;
            }
        }
    }

    async getJetStream(): Promise<JetStreamClient> {
        if (this.options.jetstream?.enabled === false) {
            throw new NatsJetStreamDisabledError();
        }
        if (!this.jetStream) {
            const connection = await this.getConnection();
            this.assertRunning();
            this.jetStream = connection.jetstream(this.getJetStreamOptions());
        }
        return this.jetStream;
    }

    getState(): NatsConnectionState {
        return { ...this.connectionState };
    }

    async healthCheck(timeoutMs: number = this.options.requestTimeoutMs): Promise<NatsHealthResult> {
        assertPositiveInteger(timeoutMs, 'health check timeout');
        const startedAt = Date.now();
        const connection = this.connection;
        if (
            this.shuttingDown ||
            !connection ||
            !this.connectionState.connected ||
            !this.isConnectionUsable(connection)
        ) {
            return {
                healthy: false,
                server: this.connectionState.server,
                latencyMs: Date.now() - startedAt,
                error: this.shuttingDown ? 'NATS service is shutting down' : 'NATS connection is not active',
            };
        }

        const result = await settleWithin(
            this.invoke(() => connection.flush()),
            timeoutMs,
        );
        if (result.status === 'fulfilled') {
            return {
                healthy: true,
                server: connection.getServer(),
                latencyMs: Date.now() - startedAt,
            };
        }

        const error =
            result.status === 'timeout'
                ? `NATS health check timed out after ${timeoutMs}ms`
                : this.errorMessage(result.reason);
        this.connectionState.lastError = error;
        return {
            healthy: false,
            server: this.connectionState.server,
            latencyMs: Date.now() - startedAt,
            error,
        };
    }

    async isHealthy(): Promise<boolean> {
        return (await this.healthCheck()).healthy;
    }

    async flush(timeoutMs: number = this.options.requestTimeoutMs): Promise<void> {
        assertPositiveInteger(timeoutMs, 'flush timeout');
        return this.runOperation(async () => {
            const connection = await this.getConnection();
            const result = await settleWithin(
                this.invoke(() => connection.flush()),
                timeoutMs,
            );
            if (result.status === 'timeout') {
                throw new NatsConnectionError(connection.getServer(), `flush timed out after ${timeoutMs}ms`);
            }
            if (result.status === 'rejected') {
                throw new NatsConnectionError(connection.getServer(), this.errorMessage(result.reason), result.reason);
            }
        });
    }

    async getStats(): Promise<Stats> {
        return this.runOperation(async () => (await this.getConnection()).stats());
    }

    // =========================================================================
    // Publish / Subscribe
    // =========================================================================

    async publish(options: PublishOptions): Promise<void> {
        try {
            await this.runOperation(async () => {
                assertNonEmptyString(options.subject, 'publish subject');
                if (options.timeout !== undefined) {
                    assertPositiveInteger(options.timeout, 'publish timeout');
                }
                const conn = await this.getConnection();
                const data = this.encodeData(options.data);

                conn.publish(options.subject, data, {
                    ...(options.headers && { headers: this.toHeaders(options.headers) }),
                    ...(options.reply && { reply: options.reply }),
                });

                if (options.timeout !== undefined) {
                    const result = await settleWithin(
                        this.invoke(() => conn.flush()),
                        options.timeout,
                    );
                    if (result.status === 'timeout') {
                        throw new Error(`publish flush timed out after ${options.timeout}ms`);
                    }
                    if (result.status === 'rejected') {
                        throw result.reason;
                    }
                }

                this.logger.debug(`Published to ${options.subject}`);
            });
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsPublishError(options.subject, this.errorMessage(error), error);
        }
    }

    async pubsub(subject: string, data?: Uint8Array | string | object): Promise<void> {
        await this.publish({
            subject,
            data,
        });
    }

    // =========================================================================
    // Request / Reply
    // =========================================================================

    async request(options: RequestOptions): Promise<NatsMessage> {
        try {
            return await this.runOperation(async () => {
                assertNonEmptyString(options.subject, 'request subject');
                if (options.expectedResponseCount !== undefined && options.expectedResponseCount !== 1) {
                    throw new RangeError('expectedResponseCount is only supported by requestMany()');
                }
                validateDedicatedReply(options.noMux, options.reply);
                const timeout = options.timeout ?? this.options.requestTimeoutMs;
                assertPositiveInteger(timeout, 'request timeout');
                const conn = await this.getConnection();
                const data = this.encodeData(options.data);

                const msg = await conn.request(options.subject, data, {
                    timeout,
                    ...(options.headers && { headers: this.toHeaders(options.headers) }),
                    ...(options.noMux && { noMux: true, reply: options.reply }),
                });

                return this.convertMessage(msg);
            });
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsRequestError(options.subject, this.errorMessage(error), error);
        }
    }

    async requestMany(options: RequestManyOptions): Promise<NatsMessage[]> {
        try {
            return await this.runOperation(async () => {
                assertNonEmptyString(options.subject, 'request subject');
                const maxWait = options.maxWait ?? this.options.requestTimeoutMs;
                assertPositiveInteger(maxWait, 'request maxWait');

                const strategy =
                    options.strategy ??
                    (options.expectedResponseCount === undefined ? RequestStrategy.Timer : RequestStrategy.Count);
                const nativeStrategy = toRequestStrategy(strategy);
                if (nativeStrategy === RequestStrategy.Count) {
                    assertPositiveInteger(options.expectedResponseCount, 'expectedResponseCount');
                } else if (options.expectedResponseCount !== undefined) {
                    throw new RangeError('expectedResponseCount can only be used with the count strategy');
                }
                if (options.jitter !== undefined) {
                    assertNonNegativeInteger(options.jitter, 'request jitter');
                    if (nativeStrategy !== RequestStrategy.JitterTimer) {
                        throw new RangeError('jitter can only be used with the jitter strategy');
                    }
                }
                if (options.noMux !== undefined && typeof options.noMux !== 'boolean') {
                    throw new TypeError('noMux must be a boolean');
                }

                const conn = await this.getConnection();
                const messages = await conn.requestMany(options.subject, this.encodeData(options.data), {
                    strategy: nativeStrategy,
                    maxWait,
                    ...(options.expectedResponseCount !== undefined && { maxMessages: options.expectedResponseCount }),
                    ...(options.jitter !== undefined && { jitter: options.jitter }),
                    ...(options.noMux !== undefined && { noMux: options.noMux }),
                    ...(options.headers && { headers: this.toHeaders(options.headers) }),
                });
                const responses: NatsMessage[] = [];
                for await (const message of messages) {
                    responses.push(this.convertMessage(message));
                }
                return responses;
            });
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsRequestError(options.subject, this.errorMessage(error), error);
        }
    }

    async request$<T>(subject: string, data?: object): Promise<T> {
        const msg = await this.request({
            subject,
            data,
        });

        return this.decodeData(msg.data) as T;
    }

    // =========================================================================
    // Subscribe
    // =========================================================================

    subscribe(options: SubscribeOptions, handler: SubscriptionHandler): Promise<Subscription> {
        return this.trackSubscriptionSetup(this.createSubscription(options, handler));
    }

    private async createSubscription(options: SubscribeOptions, handler: SubscriptionHandler): Promise<Subscription> {
        try {
            validateSubscribeOptions(options);
            assertFunction(handler, 'subscription handler');
            const conn = await this.getConnection();
            this.assertRunning();

            const sub = conn.subscribe(options.subject, {
                queue: options.queue,
                max: options.maxMessages,
                timeout: options.timeout,
            });

            const subscription = this.registerSubscription(sub, options.subject, options.queue, async msg => {
                try {
                    await handler(this.convertMessage(msg));
                } catch (error) {
                    this.logHandlerError(options.subject, error);
                }
            });

            this.logger.log(`Subscribed to ${options.subject}${options.queue ? ` (queue: ${options.queue})` : ''}`);
            return subscription;
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsSubscribeError(options.subject, this.errorMessage(error), error);
        }
    }

    async subscribe$<T = unknown>(subject: string, handler: (data: T) => Promise<void> | void): Promise<Subscription> {
        return this.subscribe({ subject }, async (msg: NatsMessage) => {
            const data = this.decodeData(msg.data) as T;
            await handler(data);
        });
    }

    unsubscribe(subscription: Subscription): void {
        if (!this.ownedSubscriptions.has(subscription)) {
            throw new NatsSubscriptionOwnershipError();
        }
        if (this.subscriptionRecords.get(subscription.sid)?.handle !== subscription) {
            return;
        }
        const sub = this.subscriptions.get(subscription.sid);
        if (sub) {
            this.cancelSubscription(subscription.sid, sub);
        }
    }

    // =========================================================================
    // JetStream
    // =========================================================================

    async jsPublish(options: JetStreamPublishOptions): Promise<PubAck> {
        try {
            return await this.runOperation(async () => {
                assertNonEmptyString(options.stream, 'JetStream stream');
                assertNonEmptyString(options.subject, 'JetStream publish subject');
                const timeout = options.timeout ?? this.options.requestTimeoutMs;
                assertPositiveInteger(timeout, 'JetStream publish timeout');
                const js = await this.getJetStream();
                const data = this.encodeData(options.data);

                const pubAck = await js.publish(options.subject, data, {
                    timeout,
                    headers: this.toHeaders(options.headers),
                });

                if (pubAck.stream !== options.stream) {
                    throw new Error(`JetStream acknowledged stream ${pubAck.stream}, expected ${options.stream}`);
                }

                this.logger.debug(`JetStream published to ${options.subject} in stream ${options.stream}`);

                return pubAck;
            });
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsPublishError(`${options.stream}:${options.subject}`, this.errorMessage(error), error);
        }
    }

    jsSubscribe(options: JetStreamSubscribeOptions, handler: JetStreamSubscriptionHandler): Promise<Subscription> {
        return this.trackSubscriptionSetup(this.createJetStreamSubscription(options, handler));
    }

    private async createJetStreamSubscription(
        options: JetStreamSubscribeOptions,
        handler: JetStreamSubscriptionHandler,
    ): Promise<Subscription> {
        try {
            validateJetStreamSubscribeOptions(options);
            assertFunction(handler, 'JetStream subscription handler');
            const js = await this.getJetStream();
            this.assertRunning();
            const consumerOptions = this.createConsumerOptions(options);
            const sub = await js.subscribe(options.subject, consumerOptions);

            if (this.shuttingDown) {
                sub.unsubscribe();
                throw new NatsServiceClosedError();
            }

            const subscription = this.registerSubscription(sub, options.subject, options.queue, async msg => {
                const natsMsg = this.convertJetStreamMessage(msg);
                const shouldAcknowledge = !options.manualAck && options.config?.ackPolicy !== 'none';

                try {
                    await handler(natsMsg);
                } catch (error) {
                    this.logHandlerError(options.subject, error);
                    if (shouldAcknowledge) {
                        this.tryAcknowledgement(options.subject, 'negatively acknowledge', () => msg.nak());
                    }
                    return;
                }

                if (shouldAcknowledge) {
                    this.tryAcknowledgement(options.subject, 'acknowledge', () => msg.ack());
                }
            });

            this.logger.log(`JetStream subscribed to ${options.subject} in stream ${options.stream}`);
            return subscription;
        } catch (error) {
            this.rethrowServiceClosed(error);
            throw new NatsSubscribeError(`${options.stream}:${options.subject}`, this.errorMessage(error), error);
        }
    }

    private createConsumerOptions(options: JetStreamSubscribeOptions): ConsumerOptsBuilder {
        const consumerOptions = consumerOpts();
        consumerOptions.bindStream(options.stream);
        consumerOptions.deliverTo(options.deliverSubject || createInbox());
        consumerOptions.manualAck();

        if (options.durable) {
            consumerOptions.durable(options.durable);
        }
        if (options.queue) {
            consumerOptions.queue(options.queue);
        }

        this.applyConsumerConfig(consumerOptions, options.config);
        return consumerOptions;
    }

    private applyConsumerConfig(consumerOptions: ConsumerOptsBuilder, config?: StreamSubscriptionConfig): void {
        if (!config) {
            return;
        }

        switch (config.deliverPolicy) {
            case 'all':
                consumerOptions.deliverAll();
                break;
            case 'last':
                consumerOptions.deliverLast();
                break;
            case 'new':
                consumerOptions.deliverNew();
                break;
            case 'last_per_subject':
                consumerOptions.deliverLastPerSubject();
                break;
            case 'by_start_sequence':
                consumerOptions.startSequence(config.startSeq!);
                break;
            case 'by_start_time':
                consumerOptions.startTime(config.startTime!);
                break;
            case undefined:
                if (config.startSeq !== undefined) {
                    consumerOptions.startSequence(config.startSeq);
                } else if (config.startTime !== undefined) {
                    consumerOptions.startTime(config.startTime);
                }
                break;
        }

        switch (config.ackPolicy) {
            case 'none':
                consumerOptions.ackNone();
                break;
            case 'all':
                consumerOptions.ackAll();
                break;
            case 'explicit':
                consumerOptions.ackExplicit();
                break;
        }

        switch (config.replayPolicy) {
            case 'instant':
                consumerOptions.replayInstantly();
                break;
            case 'original':
                consumerOptions.replayOriginal();
                break;
        }

        if (config.ackWait !== undefined) consumerOptions.ackWait(config.ackWait);
        if (config.maxDeliver !== undefined) consumerOptions.maxDeliver(config.maxDeliver);
        if (config.maxAckPending !== undefined) consumerOptions.maxAckPending(config.maxAckPending);
        if (config.rateLimit !== undefined) consumerOptions.limit(config.rateLimit);
        if (config.samplingRate !== undefined) consumerOptions.sample(config.samplingRate);
        if (config.headersOnly) consumerOptions.headersOnly();
        if (config.maxMessages !== undefined) consumerOptions.maxMessages(config.maxMessages);
        if (config.filterSubject) consumerOptions.filterSubject(config.filterSubject);
        if (config.idleHeartbeat !== undefined) consumerOptions.idleHeartbeat(config.idleHeartbeat);
        if (config.flowControl) consumerOptions.flowControl();
    }

    private trackSubscriptionSetup(setup: Promise<Subscription>): Promise<Subscription> {
        this.pendingSubscriptionSetups.add(setup);
        void setup.then(
            () => this.pendingSubscriptionSetups.delete(setup),
            () => this.pendingSubscriptionSetups.delete(setup),
        );
        return setup;
    }

    private registerSubscription<T>(
        sub: SubscriptionLifecycle & AsyncIterable<T>,
        subject: string,
        queue: string | undefined,
        handler: (message: T) => Promise<void>,
    ): Subscription {
        const sid = sub.getID();
        const existing = this.subscriptions.get(sid);
        if (existing && existing !== sub) {
            sub.unsubscribe();
            throw new Error(`NATS subscription id ${sid} is already managed`);
        }

        this.subscriptions.set(sid, sub);
        const closed = this.startSubscriptionLoop(sid, sub, subject, handler);
        let handle!: Subscription;
        handle = {
            sid,
            subject,
            queue,
            closed,
            cancel: () => this.cancelOwnedSubscription(handle, sub),
            drain: () => this.drainOwnedSubscription(handle, sub),
            isCancelled: () => sub.isClosed(),
        };
        this.subscriptionRecords.set(sid, { native: sub, handle });
        this.ownedSubscriptions.add(handle);
        return handle;
    }

    private startSubscriptionLoop<T>(
        sid: number,
        sub: SubscriptionLifecycle & AsyncIterable<T>,
        subject: string,
        handler: (message: T) => Promise<void>,
    ): Promise<void> {
        const task = (async () => {
            try {
                for await (const message of sub) {
                    await handler(message);
                }
            } catch (error) {
                this.logger.error(`Subscription on ${subject} stopped: ${this.errorMessage(error)}`);
            } finally {
                try {
                    if (!sub.isClosed()) {
                        sub.unsubscribe();
                    }
                } catch (error) {
                    this.logger.error(`Error closing NATS subscription ${sid}: ${this.errorMessage(error)}`);
                } finally {
                    if (this.subscriptions.get(sid) === sub) {
                        this.subscriptions.delete(sid);
                    }
                    if (this.subscriptionRecords.get(sid)?.native === sub) {
                        this.subscriptionRecords.delete(sid);
                    }
                }
            }
        })();

        this.subscriptionTasks.set(sid, task);
        const clearTask = () => {
            if (this.subscriptionTasks.get(sid) === task) {
                this.subscriptionTasks.delete(sid);
            }
        };
        void task.then(clearTask, clearTask);
        return task;
    }

    private cancelOwnedSubscription(handle: Subscription, sub: SubscriptionLifecycle): void {
        if (this.subscriptionRecords.get(handle.sid)?.handle !== handle) {
            return;
        }
        this.cancelSubscription(handle.sid, sub);
    }

    private async drainOwnedSubscription(handle: Subscription, sub: SubscriptionLifecycle): Promise<void> {
        if (this.subscriptionRecords.get(handle.sid)?.handle !== handle) {
            await handle.closed;
            return;
        }
        if (!sub.isClosed()) {
            await sub.drain();
        }
        await handle.closed;
    }

    private cancelSubscription(sid: number, sub: SubscriptionLifecycle): void {
        try {
            if (!sub.isClosed()) {
                sub.unsubscribe();
            }
        } finally {
            if (this.subscriptions.get(sid) === sub) {
                this.subscriptions.delete(sid);
            }
            if (this.subscriptionRecords.get(sid)?.native === sub) {
                this.subscriptionRecords.delete(sid);
            }
        }
    }

    private unsubscribeAll(): void {
        for (const [sid, sub] of [...this.subscriptions]) {
            try {
                this.cancelSubscription(sid, sub);
            } catch (error) {
                this.logger.error(`Error unsubscribing NATS subscription ${sid}: ${this.errorMessage(error)}`);
            }
        }
    }

    private logHandlerError(subject: string, error: unknown): void {
        this.logger.error(`Error handling message on ${subject}: ${this.errorMessage(error)}`);
    }

    private tryAcknowledgement(subject: string, action: string, acknowledge: () => void): void {
        try {
            acknowledge();
        } catch (error) {
            this.logger.error(`Failed to ${action} message on ${subject}: ${this.errorMessage(error)}`);
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private encodeData(data?: Uint8Array | string | object): Uint8Array {
        if (data === undefined) {
            return new Uint8Array(0);
        }

        if (data instanceof Uint8Array) {
            return data;
        }

        if (typeof data === 'string') {
            return this.stringCodec.encode(data);
        }

        return this.stringCodec.encode(JSON.stringify(data));
    }

    private decodeData(data: Uint8Array): unknown {
        if (!data || data.length === 0) {
            return null;
        }

        try {
            const str = this.stringCodec.decode(data);
            try {
                return JSON.parse(str);
            } catch {
                return str;
            }
        } catch {
            return null;
        }
    }

    private convertMessage(msg: Msg): NatsMessage {
        return this.convertMessageFields(msg);
    }

    private convertJetStreamMessage(msg: JsMsg): JetStreamMessage {
        return {
            ...this.convertMessageFields(msg),
            ack: () => msg.ack(),
            nak: (delayMs?: number) => msg.nak(delayMs),
            term: (reason?: string) => msg.term(reason),
            inProgress: () => msg.working(),
        };
    }

    private convertMessageFields(
        msg: Pick<Msg, 'data' | 'headers' | 'sid' | 'subject'> & Partial<Pick<Msg, 'reply' | 'respond'>>,
    ): NatsMessage {
        const headers: Record<string, string> = {};
        if (msg.headers) {
            for (const [key, values] of msg.headers) {
                headers[key] = values.join(',');
            }
        }

        return {
            subject: msg.subject,
            sid: msg.sid,
            data: msg.data,
            headers,
            reply: msg.reply,
            timestamp: Date.now(),
            respond: (data, responseHeaders) => {
                if (!msg.respond) {
                    return false;
                }
                return msg.respond(this.encodeData(data), {
                    ...(responseHeaders && { headers: this.toHeaders(responseHeaders) }),
                });
            },
        };
    }

    private getJetStreamOptions(): { apiPrefix?: string; domain?: string } {
        return {
            ...(this.options.jetstream?.domain && { domain: this.options.jetstream.domain }),
            ...(this.options.jetstream?.prefix && { apiPrefix: this.options.jetstream.prefix }),
        };
    }

    private assertRunning(): void {
        if (this.shuttingDown) {
            throw new NatsServiceClosedError();
        }
    }

    private rethrowServiceClosed(error: unknown): void {
        if (error instanceof NatsServiceClosedError) {
            throw error;
        }
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private toHeaders(input?: Record<string, string>): MsgHdrs | undefined {
        if (!input) {
            return undefined;
        }
        const hdrs = createNatsHeaders();
        for (const [key, value] of Object.entries(input)) {
            assertNonEmptyString(key, 'header name');
            if (typeof value !== 'string') {
                throw new TypeError(`header ${key} must be a string`);
            }
            hdrs.set(key, value);
        }
        return hdrs;
    }

    private runOperation<T>(operation: () => Promise<T>): Promise<T> {
        this.assertRunning();
        const task = Promise.resolve().then(() => {
            this.assertRunning();
            return operation();
        });
        this.inFlightOperations.add(task);
        void task.then(
            () => this.inFlightOperations.delete(task),
            () => this.inFlightOperations.delete(task),
        );
        return task;
    }

    private invoke<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return operation();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    private isConnectionUsable(connection: NatsConnection): boolean {
        try {
            return !connection.isClosed() && !connection.isDraining();
        } catch {
            return false;
        }
    }

    private trackConnectionTask(task: Promise<void>): void {
        this.connectionTasks.add(task);
        void task.then(
            () => this.connectionTasks.delete(task),
            () => this.connectionTasks.delete(task),
        );
    }

    private async observeConnectionClose(connection: NatsConnection): Promise<void> {
        try {
            const error = await connection.closed();
            if (error) {
                this.logger.error(`NATS connection closed with error: ${error.message}`);
            }
            if (this.connection === connection) {
                this.connection = null;
                this.jetStream = null;
                this.connectionState.connected = false;
                if (error) {
                    this.connectionState.lastError = error.message;
                }
            }
        } catch (error) {
            this.logger.error(`Error waiting for NATS connection close: ${this.errorMessage(error)}`);
        }
    }

    private async closeLateConnection(connection: NatsConnection): Promise<void> {
        const result = await settleWithin(
            this.invoke(() => connection.close()),
            this.options.shutdownTimeoutMs,
        );
        if (result.status !== 'fulfilled') {
            this.logSettlementFailure('closing late NATS connection', result);
        }
    }

    private async awaitTasks(tasks: Promise<unknown>[], deadline: number, description: string): Promise<void> {
        if (tasks.length === 0) {
            return;
        }
        const result = await settleWithin(Promise.allSettled(tasks), remainingMs(deadline));
        if (result.status !== 'fulfilled') {
            this.logSettlementFailure(`waiting for ${description}s`, result);
        }
    }

    private logSettlementFailure(
        action: string,
        result: Exclude<SettleResult<unknown>, { status: 'fulfilled' }>,
    ): void {
        const message =
            result.status === 'timeout'
                ? `Timed out ${action} after ${this.options.shutdownTimeoutMs}ms total shutdown time`
                : `Failed ${action}: ${this.errorMessage(result.reason)}`;
        this.connectionState.lastError = message;
        this.logger.error(message);
    }

    private async monitorStatus(connection: NatsConnection): Promise<void> {
        try {
            for await (const status of connection.status()) {
                if (this.connection !== connection) {
                    continue;
                }
                if (status.type === Events.Reconnect) {
                    this.connectionState.connected = true;
                    this.connectionState.server = connection.getServer() || '';
                    this.connectionState.reconnectCount++;
                    this.logger.log(`NATS reconnected to ${this.connectionState.server}`);
                } else if (status.type === Events.Error) {
                    const message = String(status.data ?? 'unknown error');
                    this.logger.error(`NATS connection error: ${message}`);
                    this.connectionState.lastError = message;
                } else if (status.type === Events.Disconnect) {
                    this.connectionState.connected = false;
                }
            }
        } catch (error) {
            if (this.connection === connection) {
                const message = this.errorMessage(error);
                this.connectionState.lastError = message;
                this.logger.error(`NATS status monitor stopped: ${message}`);
            }
        }
    }
}

function validateSubscribeOptions(options: SubscribeOptions): void {
    assertNonEmptyString(options.subject, 'subscription subject');
    if (options.queue !== undefined) assertNonEmptyString(options.queue, 'subscription queue');
    if (options.maxMessages !== undefined) assertPositiveInteger(options.maxMessages, 'maxMessages');
    if (options.timeout !== undefined) assertPositiveInteger(options.timeout, 'subscription timeout');
}

function validateDedicatedReply(noMux: boolean | undefined, reply: string | undefined): void {
    if (noMux !== undefined && typeof noMux !== 'boolean') {
        throw new TypeError('noMux must be a boolean');
    }
    if (reply !== undefined) {
        assertNonEmptyString(reply, 'request reply subject');
    }
    if (noMux === true && reply === undefined) {
        throw new RangeError('request reply is required when noMux is true');
    }
    if (reply !== undefined && noMux !== true) {
        throw new RangeError('request noMux must be true when reply is configured');
    }
}

function validateJetStreamSubscribeOptions(options: JetStreamSubscribeOptions): void {
    validateSubscribeOptions(options);
    assertNonEmptyString(options.stream, 'JetStream stream');
    if (options.durable !== undefined) assertNonEmptyString(options.durable, 'JetStream durable name');
    if (options.deliverSubject !== undefined) assertNonEmptyString(options.deliverSubject, 'JetStream deliver subject');
    if (options.manualAck !== undefined && typeof options.manualAck !== 'boolean') {
        throw new TypeError('manualAck must be a boolean');
    }

    const config = options.config;
    if (!config) return;
    if (config.startSeq !== undefined && config.startTime !== undefined) {
        throw new RangeError('startSeq and startTime are mutually exclusive');
    }
    if (config.startSeq !== undefined) assertPositiveInteger(config.startSeq, 'startSeq');
    if (
        config.startTime !== undefined &&
        (!(config.startTime instanceof Date) || Number.isNaN(config.startTime.getTime()))
    ) {
        throw new TypeError('startTime must be a valid Date');
    }
    if (config.deliverPolicy === 'by_start_sequence' && config.startSeq === undefined) {
        throw new RangeError('deliverPolicy by_start_sequence requires startSeq');
    }
    if (config.deliverPolicy === 'by_start_time' && config.startTime === undefined) {
        throw new RangeError('deliverPolicy by_start_time requires startTime');
    }
    if (config.ackWait !== undefined) assertPositiveInteger(config.ackWait, 'ackWait');
    if (config.maxDeliver !== undefined && config.maxDeliver !== -1) {
        assertPositiveInteger(config.maxDeliver, 'maxDeliver');
    }
    if (config.maxAckPending !== undefined) assertPositiveInteger(config.maxAckPending, 'maxAckPending');
    if (config.rateLimit !== undefined) assertPositiveInteger(config.rateLimit, 'rateLimit');
    if (config.samplingRate !== undefined) {
        assertNonNegativeInteger(config.samplingRate, 'samplingRate');
        if (config.samplingRate > 100) throw new RangeError('samplingRate must be between 0 and 100');
    }
    if (config.maxMessages !== undefined) assertPositiveInteger(config.maxMessages, 'maxMessages');
    if (config.filterSubject !== undefined) assertNonEmptyString(config.filterSubject, 'filterSubject');
    if (config.idleHeartbeat !== undefined) assertPositiveInteger(config.idleHeartbeat, 'idleHeartbeat');
}

function toRequestStrategy(strategy: NonNullable<RequestManyOptions['strategy']>): RequestStrategy {
    switch (strategy) {
        case 'count':
            return RequestStrategy.Count;
        case 'timer':
            return RequestStrategy.Timer;
        case 'jitter':
            return RequestStrategy.JitterTimer;
        case 'sentinel':
            return RequestStrategy.SentinelMsg;
        default:
            throw new RangeError(`Unsupported request strategy: ${String(strategy)}`);
    }
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
}

function assertFunction(value: unknown, name: string): asserts value is (...args: unknown[]) => unknown {
    if (typeof value !== 'function') {
        throw new TypeError(`${name} must be a function`);
    }
}

function assertPositiveInteger(value: unknown, name: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive integer`);
    }
}

function assertNonNegativeInteger(value: unknown, name: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative integer`);
    }
}

function remainingMs(deadline: number): number {
    return Math.max(0, deadline - Date.now());
}

function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<SettleResult<T>> {
    return new Promise(resolve => {
        let completed = false;
        const finish = (result: SettleResult<T>) => {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => finish({ status: 'timeout' }), Math.max(0, timeoutMs));
        void promise.then(
            value => finish({ status: 'fulfilled', value }),
            reason => finish({ status: 'rejected', reason }),
        );
    });
}
