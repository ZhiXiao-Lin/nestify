// ============================================================================
// Messaging Infrastructure Interface
// ============================================================================

import type { JetStreamClient, NatsConnection } from 'nats';
import type { PublishOptions, RequestOptions, SubscribeOptions, NatsMessage, SubscriptionHandler } from '@a3s-lab/nats';

export interface ISubscription {
    sid: number;
    subject: string;
    queue?: string;
    cancel(): void;
    isCancelled(): boolean;
}

export interface IMessagingService {
    getConnection(): Promise<NatsConnection>;
    getJetStream(): Promise<JetStreamClient>;

    publish(options: PublishOptions): Promise<void>;
    pubsub(subject: string, data: object): Promise<void>;
    request(options: RequestOptions): Promise<NatsMessage>;
    request$<T>(subject: string, data?: object): Promise<T>;

    subscribe(options: SubscribeOptions, handler: SubscriptionHandler): Promise<ISubscription>;
    subscribe$(subject: string, handler: (data: unknown) => Promise<void>): Promise<ISubscription>;
    unsubscribe(subscription: ISubscription): void;

    // Health check
    isHealthy(): Promise<boolean>;
}
