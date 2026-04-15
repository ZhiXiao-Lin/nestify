// ============================================================================
// NATS Types - Re-exported from module-definition for convenience
// ============================================================================

import type { JetStreamClient, NatsConnection, PubAck } from 'nats';

export interface NatsPackageOptions {
    servers?: string[];
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
}

/** @deprecated Use NatsPackageOptions instead */
export type NatsModuleOptions = NatsPackageOptions;

export interface TlsOptions {
    certFile?: string;
    keyFile?: string;
    caFile?: string;
    verify?: boolean;
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
    timeout?: number;
}

export interface RequestOptions extends PublishOptions {
    expectedResponseCount?: number;
    headers?: Record<string, string>;
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
    stream?: string;
    durable?: string;
    manualAck?: boolean;
    config?: SubscriptionConfig;
}

export interface SubscriptionConfig {
    deliverPolicy?: DeliverPolicy;
    ackPolicy?: AckPolicy;
    ackWait?: number;
    maxDeliver?: number;
    maxAckPending?: number;
    replayPolicy?: ReplayPolicy;
    rateLimit?: number;
    samplingRate?: number;
    headersOnly?: boolean;
    maxMessages?: number;
}

export type DeliverPolicy =
    | 'all'
    | 'last'
    | 'new'
    | 'first'
    | 'last_per_subject'
    | 'by_start_sequence'
    | 'by_start_time';

export type AckPolicy =
    | 'none'
    | 'all'
    | 'explicit'
    | 'allInclusive';

export type ReplayPolicy =
    | 'instant'
    | 'original'
    | 'by_start_time'
    | 'last';

export interface NatsMessage {
    subject: string;
    sid: number;
    data: Uint8Array;
    headers?: Record<string, string>;
    reply?: string;
    timestamp: number;
}

export interface SubscriptionHandler {
    (message: NatsMessage): Promise<void> | void;
}

// ============================================================================
// JetStream Types
// ============================================================================

export interface JetStreamPublishOptions {
    stream: string;
    subject: string;
    data?: Uint8Array | string | object;
    headers?: Record<string, string>;
    timeout?: number;
    wait?: boolean;
}

export interface JetStreamSubscribeOptions extends SubscribeOptions {
    stream: string;
    deliverSubject?: string;
    config?: StreamSubscriptionConfig;
}

export interface StreamSubscriptionConfig extends SubscriptionConfig {
    filterSubject?: string;
    subjectTransform?: {
        src: string;
        dest: string;
    };
    idleHeartbeat?: number;
    flowControl?: boolean;
    active?: boolean;
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

export type RetentionPolicy =
    | 'limits'
    | 'interest'
    | 'workqueue';

export type StorageType =
    | 'file'
    | 'memory';

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

// ============================================================================
// Errors
// ============================================================================

export class NatsError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
    ) {
        super(message);
        this.name = 'NatsError';
    }
}

export class NatsConnectionError extends NatsError {
    constructor(server: string, reason?: string) {
        super(
            `Failed to connect to NATS server ${server}: ${reason || 'Unknown error'}`,
            'NATS_CONNECTION_ERROR',
            503,
        );
    }
}

export class NatsPublishError extends NatsError {
    constructor(subject: string, reason?: string) {
        super(
            `Failed to publish to ${subject}: ${reason || 'Unknown error'}`,
            'NATS_PUBLISH_ERROR',
            500,
        );
    }
}

export class NatsSubscribeError extends NatsError {
    constructor(subject: string, reason?: string) {
        super(
            `Failed to subscribe to ${subject}: ${reason || 'Unknown error'}`,
            'NATS_SUBSCRIBE_ERROR',
            500,
        );
    }
}

export class NatsRequestError extends NatsError {
    constructor(subject: string, reason?: string) {
        super(
            `Request to ${subject} failed: ${reason || 'Unknown error'}`,
            'NATS_REQUEST_ERROR',
            504,
        );
    }
}
