// ============================================================================
// Messaging Infrastructure Interface
// ============================================================================

export interface PublishOptions {
    subject: string;
    data?: object;
    reply?: string;
    headers?: Record<string, string>;
}

export interface RequestOptions extends PublishOptions {
    timeout?: number;
}

export interface SubscribeOptions {
    subject: string;
    queue?: string;
}

export interface NatsMessage<T = unknown> {
    subject: string;
    data: T;
    reply?: string;
    headers?: Record<string, string>;
}

export type SubscriptionHandler<T = unknown> = (message: NatsMessage<T>) => Promise<void> | void;

export interface ISubscription {
    sid: number;
    subject: string;
    queue?: string;
    cancel(): void;
    isCancelled(): boolean;
}

export interface IMessagingService {
    getConnection(): Promise<unknown>;
    getJetStream(): Promise<unknown>;

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
