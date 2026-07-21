import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
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
    StringCodec,
} from 'nats';
import { MODULE_OPTIONS_TOKEN } from './nats.module-definition';
import type {
    JetStreamMessage,
    JetStreamPublishOptions,
    JetStreamSubscribeOptions,
    JetStreamSubscriptionHandler,
    NatsConnectionState,
    NatsMessage,
    NatsPackageOptions,
    PublishOptions,
    RequestOptions,
    StreamSubscriptionConfig,
    SubscribeOptions,
    SubscriptionHandler,
} from './nats.types';
import { NatsConnectionError, NatsPublishError, NatsRequestError, NatsSubscribeError } from './nats.types';

// Local type for subscription return values (not an interface - no implementation contract)
export interface Subscription {
    sid: number;
    subject: string;
    queue?: string;
    cancel(): void;
    isCancelled(): boolean;
}

type SubscriptionLifecycle = Pick<NatsSubscription, 'getID' | 'isClosed' | 'unsubscribe'>;

@Injectable()
export class NatsServiceImpl implements OnModuleInit, OnModuleDestroy {
    private connection: NatsConnection | null = null;
    private jetStream: JetStreamClient | null = null;
    private readonly subscriptions = new Map<number, SubscriptionLifecycle>();
    private readonly subscriptionTasks = new Map<number, Promise<void>>();
    private readonly pendingSubscriptionSetups = new Set<Promise<Subscription>>();
    private connectionState: NatsConnectionState;
    private disconnectPromise: Promise<void> | null = null;
    private shuttingDown = false;
    private readonly logger = new Logger(NatsServiceImpl.name);
    private readonly stringCodec = StringCodec();

    constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: NatsPackageOptions) {
        this.connectionState = {
            connected: false,
            server: '',
            reconnectCount: 0,
        };
    }

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    // =========================================================================
    // Connection Management
    // =========================================================================

    private async connect(): Promise<void> {
        try {
            this.assertRunning();
            const servers = this.options.servers || ['nats://localhost:4222'];

            const connection = await connect({
                servers,
                name: this.options.name || 'nestjs-nats',
                user: this.options.user,
                pass: this.options.pass,
                token: this.options.token,
                maxReconnectAttempts: this.options.maxReconnectAttempts ?? -1,
                reconnectTimeWait: this.options.reconnectTimeWait ?? 2000,
                timeout: this.options.timeout ?? 10000,
                pingInterval: this.options.pingInterval ?? 60000,
                maxPingOut: this.options.maxPingOut ?? 2,
                ...(this.options.tls && {
                    tls: {
                        certFile: this.options.tls.certFile,
                        keyFile: this.options.tls.keyFile,
                        caFile: this.options.tls.caFile,
                    },
                }),
            });

            if (this.shuttingDown) {
                await connection.close();
                throw new Error('NATS service is shutting down');
            }

            this.connection = connection;

            this.connectionState = {
                connected: true,
                server: connection.getServer(),
                reconnectCount: 0,
            };

            void connection
                .closed()
                .then(err => {
                    if (err) {
                        this.logger.error(`NATS connection closed with error: ${err.message}`);
                    }
                    if (this.connection === connection) {
                        this.connectionState.connected = false;
                    }
                })
                .catch(error => {
                    this.logger.error(`Error waiting for NATS connection close: ${this.errorMessage(error)}`);
                });

            void this.monitorStatus(connection);

            if (this.options.jetstream?.enabled !== false) {
                this.jetStream = connection.jetstream(this.getJetStreamOptions());
            }

            this.logger.log(`Connected to NATS at ${this.connectionState.server}`);
        } catch (error) {
            const err = error as Error;
            this.connectionState.lastError = err.message;
            this.connectionState.connected = false;
            throw new NatsConnectionError(this.options.servers?.[0] || 'localhost:4222', err.message);
        }
    }

    private disconnect(): Promise<void> {
        this.shuttingDown = true;
        this.disconnectPromise ??= this.performDisconnect();
        return this.disconnectPromise;
    }

    private async performDisconnect(): Promise<void> {
        this.unsubscribeAll();
        await Promise.allSettled([...this.pendingSubscriptionSetups]);
        this.unsubscribeAll();
        await Promise.allSettled([...this.subscriptionTasks.values()]);

        const connection = this.connection;
        this.connection = null;
        this.jetStream = null;
        this.connectionState.connected = false;

        if (!connection) {
            return;
        }

        try {
            await connection.close();
            this.logger.log('NATS connection closed');
        } catch (error) {
            this.logger.error(`Error closing NATS connection: ${this.errorMessage(error)}`);
        }
    }

    async getConnection(): Promise<NatsConnection> {
        this.assertRunning();
        if (!this.connection) {
            await this.connect();
        }
        this.assertRunning();
        return this.connection!;
    }

    async getJetStream(): Promise<JetStreamClient> {
        if (this.options.jetstream?.enabled === false) {
            throw new Error('JetStream is disabled by module configuration');
        }
        if (!this.jetStream) {
            const connection = await this.getConnection();
            this.jetStream = connection.jetstream(this.getJetStreamOptions());
        }
        return this.jetStream;
    }

    getState(): NatsConnectionState {
        return { ...this.connectionState };
    }

    async isHealthy(): Promise<boolean> {
        try {
            if (!this.connection || this.connectionState.connected === false) {
                return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    // =========================================================================
    // Publish / Subscribe
    // =========================================================================

    async publish(options: PublishOptions): Promise<void> {
        try {
            const conn = await this.getConnection();
            const data = this.encodeData(options.data);

            conn.publish(options.subject, data, {
                ...(options.headers && { headers: this.toHeaders(options.headers) }),
                ...(options.reply && { reply: options.reply }),
            });

            this.logger.debug(`Published to ${options.subject}`);
        } catch (error) {
            throw new NatsPublishError(options.subject, (error as Error).message);
        }
    }

    async pubsub(subject: string, data: object): Promise<void> {
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
            const conn = await this.getConnection();
            const data = this.encodeData(options.data);
            const timeout = options.timeout ?? 5000;

            const msg = await conn.request(options.subject, data, {
                timeout,
                ...(options.headers && { headers: this.toHeaders(options.headers) }),
            });

            return this.convertMessage(msg);
        } catch (error) {
            throw new NatsRequestError(options.subject, (error as Error).message);
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
            const conn = await this.getConnection();
            this.assertRunning();

            const sub = conn.subscribe(options.subject, {
                queue: options.queue,
            });

            const sid = sub.getID();
            this.subscriptions.set(sid, sub);

            this.startSubscriptionLoop(sid, sub, options.subject, async msg => {
                try {
                    await handler(this.convertMessage(msg));
                } catch (error) {
                    this.logHandlerError(options.subject, error);
                }
            });

            this.logger.log(`Subscribed to ${options.subject}${options.queue ? ` (queue: ${options.queue})` : ''}`);

            return {
                sid,
                subject: options.subject,
                queue: options.queue,
                cancel: () => {
                    this.cancelSubscription(sid, sub);
                },
                isCancelled: () => sub.isClosed(),
            };
        } catch (error) {
            throw new NatsSubscribeError(options.subject, (error as Error).message);
        }
    }

    async subscribe$(subject: string, handler: (data: unknown) => Promise<void>): Promise<Subscription> {
        return this.subscribe({ subject }, async (msg: NatsMessage) => {
            const data = this.decodeData(msg.data);
            await handler(data);
        });
    }

    unsubscribe(subscription: Subscription): void {
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
            const js = await this.getJetStream();
            const data = this.encodeData(options.data);

            const pubAck = await js.publish(options.subject, data, {
                timeout: options.timeout ?? 5000,
                headers: this.toHeaders(options.headers),
            });

            this.logger.debug(`JetStream published to ${options.subject} in stream ${options.stream}`);

            return pubAck;
        } catch (error) {
            throw new NatsPublishError(`${options.stream}:${options.subject}`, (error as Error).message);
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
            const js = await this.getJetStream();
            this.assertRunning();
            const consumerOptions = this.createConsumerOptions(options);
            const sub = await js.subscribe(options.subject, consumerOptions);

            if (this.shuttingDown) {
                sub.unsubscribe();
                throw new Error('NATS service is shutting down');
            }

            const sid = sub.getID();
            this.subscriptions.set(sid, sub);

            this.startSubscriptionLoop(sid, sub, options.subject, async msg => {
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

            return {
                sid,
                subject: options.subject,
                queue: options.queue,
                cancel: () => {
                    this.cancelSubscription(sid, sub);
                },
                isCancelled: () => sub.isClosed(),
            };
        } catch (error) {
            throw new NatsSubscribeError(`${options.stream}:${options.subject}`, (error as Error).message);
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

        if (config.startSeq !== undefined && config.startTime !== undefined) {
            throw new Error('startSeq and startTime are mutually exclusive');
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
                if (config.startSeq === undefined) {
                    throw new Error('deliverPolicy by_start_sequence requires startSeq');
                }
                consumerOptions.startSequence(config.startSeq);
                break;
            case 'by_start_time':
                if (config.startTime === undefined) {
                    throw new Error('deliverPolicy by_start_time requires startTime');
                }
                consumerOptions.startTime(config.startTime);
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

    private startSubscriptionLoop<T>(
        sid: number,
        sub: SubscriptionLifecycle & AsyncIterable<T>,
        subject: string,
        handler: (message: T) => Promise<void>,
    ): void {
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
        if (!data) {
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
        msg: Pick<Msg, 'data' | 'headers' | 'sid' | 'subject'> & Partial<Pick<Msg, 'reply'>>,
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
            throw new Error('NATS service is shutting down');
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
            hdrs.set(key, value);
        }
        return hdrs;
    }

    private async monitorStatus(connection: NatsConnection): Promise<void> {
        try {
            for await (const status of connection.status()) {
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
            this.logger.error(`NATS status monitor stopped: ${this.errorMessage(error)}`);
        }
    }
}
