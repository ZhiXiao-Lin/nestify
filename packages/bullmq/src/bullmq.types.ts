import type { DynamicModule, FactoryProvider } from '@nestjs/common';
import type {
    ConnectionOptions,
    DefaultJobOptions,
    Job,
    JobsOptions,
    Processor,
    Queue,
    QueueEvents,
    QueueEventsOptions,
    QueueOptions,
    Worker,
    WorkerOptions,
} from 'bullmq';

export type {
    ConnectionOptions,
    DefaultJobOptions,
    Job,
    JobsOptions,
    Processor,
    Queue,
    QueueEvents,
    QueueEventsOptions,
    QueueOptions,
    Worker,
    WorkerOptions,
};

export type BullMQQueueOptions = Omit<QueueOptions, 'connection' | 'defaultJobOptions' | 'prefix'>;
export type BullMQWorkerDefaults = Omit<WorkerOptions, 'connection' | 'prefix'>;
export type BullMQQueueEventsOptions = Omit<QueueEventsOptions, 'connection' | 'prefix'>;

export interface BullMQWorkerOptions extends BullMQWorkerDefaults {
    /** Stable local identifier. Different ids allow multiple workers for one queue. */
    id?: string;
}

export interface BullMQModuleOptions {
    /** A BullMQ connection configuration or an existing compatible ioredis client. */
    connection: ConnectionOptions;
    /** Default options inherited by jobs which do not override them. */
    defaultJobOptions?: DefaultJobOptions;
    /** Prefix shared by every resource owned by this module. */
    prefix?: string;
    /** Advanced first-party Queue options, excluding module-owned fields. */
    queueOptions?: BullMQQueueOptions;
    /** Advanced first-party Worker defaults, excluding module-owned fields. */
    workerOptions?: BullMQWorkerDefaults;
    /** Advanced first-party QueueEvents defaults, excluding module-owned fields. */
    queueEventsOptions?: BullMQQueueEventsOptions;
    /** Total graceful shutdown budget. Defaults to 10 seconds. */
    shutdownTimeoutMs?: number;
    /** Connection readiness budget used by healthCheck. Defaults to 2 seconds. */
    healthTimeoutMs?: number;
    /** Force-close workers if graceful shutdown exhausts the budget. Defaults to true. */
    forceWorkerCloseOnTimeout?: boolean;
}

export interface BullMQAsyncOptions {
    imports?: DynamicModule['imports'];
    useFactory: (...args: unknown[]) => BullMQModuleOptions | Promise<BullMQModuleOptions>;
    inject?: FactoryProvider['inject'];
}

export interface BullMQOptionsFactory {
    createBullMQOptions(): BullMQModuleOptions | Promise<BullMQModuleOptions>;
}

export interface JobData {
    [key: string]: unknown;
}

/** @deprecated Processors can return their result directly. */
export interface JobResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

export type JobProcessor<DataType = JobData, ResultType = unknown, NameType extends string = string> = Processor<
    DataType,
    ResultType,
    NameType
>;

export type BullMQCleanStatus =
    | 'active'
    | 'completed'
    | 'delayed'
    | 'failed'
    | 'paused'
    | 'prioritized'
    | 'wait'
    | 'waiting';

export interface QueueMetrics {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

export interface BullMQHealthResult {
    healthy: boolean;
    queue: string;
    latencyMs: number;
    error?: string;
}

export interface BullMQServiceStats {
    queues: number;
    workers: number;
    queueEvents: number;
    activeOperations: number;
    closing: boolean;
}

export class BullMQPackageError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'BullMQPackageError';
    }
}

export class BullMQConfigurationError extends BullMQPackageError {
    constructor(message: string, cause?: unknown) {
        super(message, 'BULLMQ_CONFIGURATION_ERROR', 500, cause === undefined ? undefined : { cause });
        this.name = 'BullMQConfigurationError';
    }
}

export class BullMQRequestError extends BullMQPackageError {
    constructor(message: string) {
        super(message, 'BULLMQ_REQUEST_ERROR', 400);
        this.name = 'BullMQRequestError';
    }
}

export class BullMQServiceClosedError extends BullMQPackageError {
    constructor() {
        super('BullMQ service is closing or already closed', 'BULLMQ_SERVICE_CLOSED', 503);
        this.name = 'BullMQServiceClosedError';
    }
}

export class BullMQWorkerConflictError extends BullMQPackageError {
    constructor(workerId: string, existingQueue: string, requestedQueue: string) {
        super(
            `Worker '${workerId}' already belongs to queue '${existingQueue}', not '${requestedQueue}'`,
            'BULLMQ_WORKER_CONFLICT',
            409,
        );
        this.name = 'BullMQWorkerConflictError';
    }
}

export class BullMQShutdownError extends BullMQPackageError {
    constructor(public readonly errors: readonly unknown[]) {
        super(
            `BullMQ shutdown completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`,
            'BULLMQ_SHUTDOWN_ERROR',
            500,
            { cause: new AggregateError(errors, 'BullMQ shutdown errors') },
        );
        this.name = 'BullMQShutdownError';
    }
}
