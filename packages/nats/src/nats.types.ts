// ============================================================================
// NATS Types - Re-exported from module-definition for convenience
// ============================================================================

import type { PubAck } from 'nats';

export interface NatsPackageOptions {
    servers?: string | string[];
    name?: string;
    user?: string;
    pass?: string;
    token?: string;
    maxReconnectAttempts?: number;
    reconnectTimeWait?: number;
    timeout?: number;
    pingInterval?: number;
    maxPingOut?: number;
    tls?: TlsOptions;
    auth?: AuthOptions;
    jetstream?: JetStreamOptions;
    /** Maximum total time spent draining operations and closing the connection. Defaults to 10 seconds. */
    shutdownTimeoutMs?: number;
    /** Drain buffered messages before closing. Defaults to true. */
    drainOnShutdown?: boolean;
    /** Default timeout for request/reply and health probes. Defaults to 5 seconds. */
    requestTimeoutMs?: number;
}

/** @deprecated Use NatsPackageOptions instead */
export type NatsModuleOptions = NatsPackageOptions;

export interface TlsOptions {
    handshakeFirst?: boolean;
    certFile?: string;
    keyFile?: string;
    caFile?: string;
    cert?: string;
    key?: string;
    ca?: string;
    /** Verify the server certificate. This compatibility alias defaults to true. */
    verify?: boolean;
    /** Verify the server certificate. Prefer this explicit Node.js TLS name for new configurations. */
    rejectUnauthorized?: boolean;
}

export interface AuthOptions {
    user?: string;
    pass?: string;
    token?: string;
}

export interface JetStreamOptions {
    enabled?: boolean;
    domain?: string;
    prefix?: string;
}

export interface NatsConnectionState {
    connected: boolean;
    server: string;
    lastError?: string;
    reconnectCount: number;
}

// ============================================================================
// Publisher Types
// ============================================================================

export interface PublishOptions {
    subject: string;
    data?: Uint8Array | string | object;
    headers?: Record<string, string>;
    reply?: string;
    /** When set, flush the connection and require a server round trip within this duration. */
    timeout?: number;
}

export interface RequestOptions extends PublishOptions {
    /** Maximum time to wait for the response. */
    timeout?: number;
    /** @deprecated Use `requestMany()` for more than one response. */
    expectedResponseCount?: number;
    /** Use a dedicated response subscription. Requires `reply`. */
    noMux?: boolean;
    headers?: Record<string, string>;
}

export type RequestManyStrategy = 'count' | 'timer' | 'jitter' | 'sentinel';

export interface RequestManyOptions {
    subject: string;
    data?: Uint8Array | string | object;
    headers?: Record<string, string>;
    /** Maximum collection window. Defaults to the package request timeout. */
    maxWait?: number;
    /** Completion strategy. Defaults to `count` when a response count is supplied, otherwise `timer`. */
    strategy?: RequestManyStrategy;
    /** Required for the `count` strategy. */
    expectedResponseCount?: number;
    /** Jitter window for the `jitter` strategy. */
    jitter?: number;
    /** Use a dedicated response subscription rather than the shared request multiplexer. */
    noMux?: boolean;
}

export interface PubAckPromise {
    promise: Promise<PubAck>;
    subject: string;
    data?: Uint8Array | string | object;
}

// ============================================================================
// Subscriber Types
// ============================================================================

export interface SubscribeOptions {
    subject: string;
    queue?: string;
    /** Automatically stop after receiving this many messages. */
    maxMessages?: number;
    /** Fail the subscription iterator if no first message arrives within this duration. */
    timeout?: number;
}

export interface SubscriptionConfig {
    deliverPolicy?: DeliverPolicy;
    ackPolicy?: AckPolicy;
    /** Number of milliseconds before an unacknowledged message is redelivered. */
    ackWait?: number;
    maxDeliver?: number;
    maxAckPending?: number;
    replayPolicy?: ReplayPolicy;
    /** Delivery rate limit in bits per second. */
    rateLimit?: number;
    /** Percentage of acknowledgements to sample, from 0 through 100. */
    samplingRate?: number;
    headersOnly?: boolean;
    maxMessages?: number;
}

export type DeliverPolicy = 'all' | 'last' | 'new' | 'last_per_subject' | 'by_start_sequence' | 'by_start_time';

export type AckPolicy = 'none' | 'all' | 'explicit';

export type ReplayPolicy = 'instant' | 'original';

export interface NatsMessage {
    subject: string;
    sid: number;
    data: Uint8Array;
    headers?: Record<string, string>;
    reply?: string;
    timestamp: number;
    /** Respond to the message's reply subject. Returns false when no reply subject exists. */
    respond(data?: Uint8Array | string | object, headers?: Record<string, string>): boolean;
}

export interface JetStreamMessage extends NatsMessage {
    /** Acknowledge successful processing of this JetStream message. */
    ack(): void;
    /**
     * Negatively acknowledge a JetStream message so it can be redelivered.
     */
    nak(delayMs?: number): void;
    /**
     * Stop redelivery of a JetStream message after a terminal failure.
     */
    term(reason?: string): void;
    /**
     * Notify JetStream that processing is still in progress and reset the ack timer.
     */
    inProgress(): void;
}

export type SubscriptionHandler = (message: NatsMessage) => Promise<void> | void;
export type JetStreamSubscriptionHandler = (message: JetStreamMessage) => Promise<void> | void;

// ============================================================================
// JetStream Types
// ============================================================================

export interface JetStreamPublishOptions {
    stream: string;
    subject: string;
    data?: Uint8Array | string | object;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface JetStreamSubscribeOptions extends SubscribeOptions {
    stream: string;
    durable?: string;
    deliverSubject?: string;
    manualAck?: boolean;
    config?: StreamSubscriptionConfig;
}

export interface StreamSubscriptionConfig extends SubscriptionConfig {
    filterSubject?: string;
    /** Idle heartbeat interval in milliseconds. */
    idleHeartbeat?: number;
    flowControl?: boolean;
    startSeq?: number;
    startTime?: Date;
}

export interface StreamInfo {
    config: StreamConfig;
    state: StreamState;
    created: Date;
    cluster?: ClusterInfo;
}

export interface StreamConfig {
    name: string;
    subjects?: string[];
    retention?: RetentionPolicy;
    maxConsumers?: number;
    maxMsgs?: number;
    maxBytes?: number;
    maxAge?: number;
    storage?: StorageType;
    replicas?: number;
    template?: string;
    denyDelete?: boolean;
    denyPurge?: boolean;
    allowRollup?: boolean;
}

export type RetentionPolicy = 'limits' | 'interest' | 'workqueue';

export type StorageType = 'file' | 'memory';

export interface StreamState {
    messages: number;
    bytes: number;
    firstSeq: number;
    firstTs: Date;
    lastSeq: number;
    lastTs: Date;
    consumerCount: number;
    numSubjects?: number;
}

export interface ClusterInfo {
    leader: string;
    replicas: PeerInfo[];
}

export interface PeerInfo {
    name: string;
    current: boolean;
    offline: boolean;
    active: number;
    lag?: number;
}

export interface NatsHealthResult {
    healthy: boolean;
    server: string;
    latencyMs: number;
    error?: string;
}

// ============================================================================
// Errors
// ============================================================================

export class NatsError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'NatsError';
    }
}

export class NatsConnectionError extends NatsError {
    constructor(server: string, reason?: string, cause?: unknown) {
        super(
            `Failed to connect to NATS server ${server}: ${reason || 'Unknown error'}`,
            'NATS_CONNECTION_ERROR',
            503,
            cause === undefined ? undefined : { cause },
        );
        this.name = 'NatsConnectionError';
    }
}

export class NatsPublishError extends NatsError {
    constructor(subject: string, reason?: string, cause?: unknown) {
        super(
            `Failed to publish to ${subject}: ${reason || 'Unknown error'}`,
            'NATS_PUBLISH_ERROR',
            500,
            cause === undefined ? undefined : { cause },
        );
        this.name = 'NatsPublishError';
    }
}

export class NatsSubscribeError extends NatsError {
    constructor(subject: string, reason?: string, cause?: unknown) {
        super(
            `Failed to subscribe to ${subject}: ${reason || 'Unknown error'}`,
            'NATS_SUBSCRIBE_ERROR',
            500,
            cause === undefined ? undefined : { cause },
        );
        this.name = 'NatsSubscribeError';
    }
}

export class NatsRequestError extends NatsError {
    constructor(subject: string, reason?: string, cause?: unknown) {
        super(
            `Request to ${subject} failed: ${reason || 'Unknown error'}`,
            'NATS_REQUEST_ERROR',
            504,
            cause === undefined ? undefined : { cause },
        );
        this.name = 'NatsRequestError';
    }
}

export class NatsConfigurationError extends NatsError {
    constructor(reason: string) {
        super(`Invalid NATS configuration: ${reason}`, 'NATS_CONFIGURATION_ERROR', 500);
        this.name = 'NatsConfigurationError';
    }
}

export class NatsServiceClosedError extends NatsError {
    constructor() {
        super('NATS service is shutting down', 'NATS_SERVICE_CLOSED', 503);
        this.name = 'NatsServiceClosedError';
    }
}

export class NatsJetStreamDisabledError extends NatsError {
    constructor() {
        super('JetStream is disabled by module configuration', 'NATS_JETSTREAM_DISABLED', 503);
        this.name = 'NatsJetStreamDisabledError';
    }
}

export class NatsSubscriptionOwnershipError extends NatsError {
    constructor() {
        super('The subscription is not managed by this NatsService instance', 'NATS_SUBSCRIPTION_OWNERSHIP_ERROR', 400);
        this.name = 'NatsSubscriptionOwnershipError';
    }
}
