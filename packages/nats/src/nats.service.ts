import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, NatsConnection, JetStreamClient, StringCodec, Msg, Subscription as NatsSubscription } from 'nats';
import {
    NatsPackageOptions,
    NatsConnectionState,
    PublishOptions,
    RequestOptions,
    SubscribeOptions,
    NatsMessage,
    SubscriptionHandler,
    JetStreamPublishOptions,
    JetStreamSubscribeOptions,
    NatsService,
    Subscription,
    NatsError,
    NatsConnectionError,
    NatsPublishError,
    NatsSubscribeError,
    NatsRequestError,
} from './nats.types';

@Injectable()
export class NatsServiceImpl implements OnModuleInit, OnModuleDestroy, NatsService {
    private connection: NatsConnection | null = null;
    private jetStream: JetStreamClient | null = null;
    private subscriptions: Map<number, NatsSubscription> = new Map();
    private connectionState: NatsConnectionState;
    private readonly logger = new Logger(NatsServiceImpl.name);
    private readonly stringCodec = StringCodec();

    constructor(private readonly options: NatsPackageOptions) {
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
            const servers = this.options.servers || ['nats://localhost:4222'];

            this.connection = await connect({
                servers,
                name: this.options.name || 'nestjs-nats',
                user: this.options.user,
                password: this.options.pass,
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
                        verify: this.options.tls.verify ?? true,
                    },
                }),
            });

            this.connectionState = {
                connected: true,
                server: this.connection.getServer(),
                reconnectCount: 0,
            };

            this.connection.closed().then((err) => {
                if (err) {
                    this.logger.error(`NATS connection closed with error: ${err.message}`);
                }
                this.connectionState.connected = false;
            });

            this.connection.on('reconnect', () => {
                this.connectionState.connected = true;
                this.connectionState.server = this.connection?.getServer() || '';
                this.connectionState.reconnectCount++;
                this.logger.log(`NATS reconnected to ${this.connectionState.server}`);
            });

            this.connection.on('error', (err) => {
                this.logger.error(`NATS connection error: ${err.message}`);
                this.connectionState.lastError = err.message;
            });

            if (this.options.jetstream?.enabled !== false) {
                this.jetStream = this.connection.jetstream();
            }

            this.logger.log(`Connected to NATS at ${this.connectionState.server}`);
        } catch (error) {
            const err = error as Error;
            this.connectionState.lastError = err.message;
            this.connectionState.connected = false;
            throw new NatsConnectionError(
                this.options.servers?.[0] || 'localhost:4222',
                err.message,
            );
        }
    }

    private async disconnect(): Promise<void> {
        try {
            for (const [sid, sub] of this.subscriptions) {
                sub.unsubscribe();
                this.subscriptions.delete(sid);
            }

            if (this.connection) {
                await this.connection.close();
                this.connection = null;
                this.jetStream = null;
                this.connectionState.connected = false;
                this.logger.log('NATS connection closed');
            }
        } catch (error) {
            this.logger.error(`Error closing NATS connection: ${(error as Error).message}`);
        }
    }

    async getConnection(): Promise<NatsConnection> {
        if (!this.connection || !this.connectionState.connected) {
            await this.connect();
        }
        return this.connection!;
    }

    async getJetStream(): Promise<JetStreamClient> {
        if (!this.jetStream) {
            await this.getConnection();
        }
        return this.jetStream!;
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
                ...(options.headers && { headers: options.headers }),
                ...(options.reply && { reply: options.reply }),
            });

            this.logger.debug(`Published to ${options.subject}`);
        } catch (error) {
            throw new NatsPublishError(
                options.subject,
                (error as Error).message,
            );
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
                ...(options.headers && { headers: options.headers }),
            });

            return this.convertMessage(msg);
        } catch (error) {
            throw new NatsRequestError(
                options.subject,
                (error as Error).message,
            );
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

    async subscribe(
        options: SubscribeOptions,
        handler: SubscriptionHandler,
    ): Promise<Subscription> {
        try {
            const conn = await this.getConnection();

            const sub = conn.subscribe(options.subject, {
                queue: options.queue,
                ...(options.config && { config: options.config }),
                ...(options.durable && { durable: options.durable }),
            });

            this.subscriptions.set(sub.sid, sub);

            this.handleSubscription(sub, handler, options);

            this.logger.log(`Subscribed to ${options.subject}${options.queue ? ` (queue: ${options.queue})` : ''}`);

            return {
                sid: sub.sid,
                subject: options.subject,
                queue: options.queue,
                cancel: () => {
                    sub.unsubscribe();
                    this.subscriptions.delete(sub.sid);
                },
                isCancelled: () => sub.isCancelled(),
            };
        } catch (error) {
            throw new NatsSubscribeError(
                options.subject,
                (error as Error).message,
            );
        }
    }

    async subscribe$(
        subject: string,
        handler: (data: unknown) => Promise<void>,
    ): Promise<Subscription> {
        return this.subscribe(
            { subject },
            async (msg: NatsMessage) => {
                const data = this.decodeData(msg.data);
                await handler(data);
            },
        );
    }

    unsubscribe(subscription: Subscription): void {
        const sub = this.subscriptions.get(subscription.sid);
        if (sub) {
            sub.unsubscribe();
            this.subscriptions.delete(subscription.sid);
        }
    }

    private async handleSubscription(
        sub: NatsSubscription,
        handler: SubscriptionHandler,
        options: SubscribeOptions,
    ): Promise<void> {
        (async () => {
            for await (const msg of sub) {
                const natsMsg = this.convertMessage(msg);

                try {
                    await handler(natsMsg);

                    if (!options.manualAck) {
                        msg.ack();
                    }
                } catch (error) {
                    this.logger.error(`Error handling message on ${options.subject}: ${(error as Error).message}`);
                    if (!options.manualAck) {
                        msg.ack();
                    }
                }
            }
        })();
    }

    // =========================================================================
    // JetStream
    // =========================================================================

    async jsPublish(options: JetStreamPublishOptions): Promise<PubAck> {
        try {
            const js = await this.getJetStream();
            const data = this.encodeData(options.data);

            const jsm = js as unknown as {
                publish(
                    subject: string,
                    data?: Uint8Array,
                    options?: {
                        timeout?: number;
                        headers?: Record<string, string>;
                        wait?: boolean;
                    },
                ): Promise<PubAck>;
            };

            const pubAck = await jsm.publish(options.subject, data, {
                timeout: options.timeout ?? 5000,
                headers: options.headers,
                wait: options.wait ?? true,
            });

            this.logger.debug(`JetStream published to ${options.subject} in stream ${options.stream}`);

            return pubAck;
        } catch (error) {
            throw new NatsPublishError(
                `${options.stream}:${options.subject}`,
                (error as Error).message,
            );
        }
    }

    async jsSubscribe(
        options: JetStreamSubscribeOptions,
        handler: SubscriptionHandler,
    ): Promise<Subscription> {
        try {
            const js = await this.getJetStream();

            const opts = {
                stream: options.stream,
                ...(options.deliverSubject && { deliverSubject: options.deliverSubject }),
                ...(options.config && { config: options.config }),
                ...(options.durable && { durable: options.durable }),
                ...(options.queue && { queue: options.queue }),
            };

            const sub = (js as unknown as {
                subscribe(
                    subject: string,
                    opts?: {
                        stream?: string;
                        deliverSubject?: string;
                        durable?: string;
                        queue?: string;
                        config?: Record<string, unknown>;
                    },
                ): NatsSubscription;
            }).subscribe(options.subject, opts);

            this.subscriptions.set(sub.sid, sub);

            this.handleSubscription(sub, handler, options);

            this.logger.log(`JetStream subscribed to ${options.subject} in stream ${options.stream}`);

            return {
                sid: sub.sid,
                subject: options.subject,
                queue: options.queue,
                cancel: () => {
                    sub.unsubscribe();
                    this.subscriptions.delete(sub.sid);
                },
                isCancelled: () => sub.isCancelled(),
            };
        } catch (error) {
            throw new NatsSubscribeError(
                `${options.stream}:${options.subject}`,
                (error as Error).message,
            );
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
        const headers: Record<string, string> = {};
        if (msg.headers) {
            msg.headers.forEach((value, key) => {
                headers[key] = value;
            });
        }

        return {
            subject: msg.subject,
            sid: 0,
            data: msg.data,
            headers,
            reply: msg.reply,
            timestamp: Date.now(),
        };
    }
}
