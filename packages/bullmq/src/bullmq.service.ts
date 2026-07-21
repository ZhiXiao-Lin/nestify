import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
    type Job,
    type JobsOptions,
    Queue,
    QueueEvents,
    type QueueEventsOptions,
    type QueueOptions,
    Worker,
    type WorkerOptions,
} from 'bullmq';
import { BULLMQ_OPTIONS_TOKEN } from './bullmq.module-definition';
import {
    type BullMQCleanStatus,
    type BullMQHealthResult,
    type BullMQModuleOptions,
    BullMQRequestError,
    BullMQServiceClosedError,
    type BullMQServiceStats,
    BullMQShutdownError,
    BullMQWorkerConflictError,
    type BullMQWorkerOptions,
    type JobData,
    type JobProcessor,
    type QueueMetrics,
} from './bullmq.types';
import { type NormalizedBullMQModuleOptions, normalizeBullMQModuleOptions } from './bullmq-options';

interface ManagedWorker {
    queueName: string;
    worker: Worker;
}

interface ShutdownAction {
    label: string;
    run: () => Promise<unknown>;
}

type SettleResult<T> =
    | { status: 'fulfilled'; value: T }
    | { status: 'rejected'; reason: unknown }
    | { status: 'timeout' };

const CLEAN_STATUSES: ReadonlySet<BullMQCleanStatus> = new Set([
    'active',
    'completed',
    'delayed',
    'failed',
    'paused',
    'prioritized',
    'wait',
    'waiting',
]);

@Injectable()
export class BullMQService implements OnModuleDestroy {
    private readonly queues = new Map<string, Queue>();
    private readonly workers = new Map<string, ManagedWorker>();
    private readonly queueEvents = new Map<string, QueueEvents>();
    private readonly inFlightOperations = new Set<Promise<unknown>>();
    private readonly logger = new Logger(BullMQService.name);
    private readonly options: NormalizedBullMQModuleOptions;
    private closing = false;
    private closePromise?: Promise<void>;

    constructor(@Inject(BULLMQ_OPTIONS_TOKEN) options: BullMQModuleOptions) {
        this.options = normalizeBullMQModuleOptions(options);
    }

    /** Get or create an owned Queue instance. */
    getQueue<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        name: string,
    ): Queue<DataType, ResultType, NameType> {
        this.assertRunning();
        const queueName = validateQueueName(name);
        const existing = this.queues.get(queueName);
        if (existing) {
            return existing as Queue<DataType, ResultType, NameType>;
        }

        const queueOptions: QueueOptions = {
            ...this.options.queueOptions,
            connection: this.options.connection,
            ...(this.options.defaultJobOptions && {
                defaultJobOptions: this.options.defaultJobOptions,
            }),
            ...(this.options.prefix && { prefix: this.options.prefix }),
        };
        const queue = new Queue<DataType, ResultType, NameType>(queueName, queueOptions);
        queue.on('error', error => this.logger.error(`Queue '${queueName}' error: ${errorMessage(error)}`));
        this.queues.set(queueName, queue);
        this.logger.log(`Queue '${queueName}' created`);
        return queue;
    }

    /** Add a job without overriding Queue.defaultJobOptions when options are omitted. */
    addJob<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        queueName: string,
        jobName: NameType,
        data: DataType,
        options?: JobsOptions,
    ): Promise<Job<DataType, ResultType, NameType>> {
        return this.runOperation(async () => {
            const name = validateJobName(jobName);
            validateOptionalObject(options, 'job options');
            const queue = this.getQueue<DataType, ResultType, NameType>(queueName);
            const add = queue.add.bind(queue) as unknown as (
                jobName: NameType,
                jobData: DataType,
                jobOptions?: JobsOptions,
            ) => Promise<Job<DataType, ResultType, NameType>>;
            const job = await add(name, data, options);
            this.logger.debug(`Job '${name}' added to queue '${queue.name}'`);
            return job;
        });
    }

    addDelayedJob<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        queueName: string,
        jobName: NameType,
        data: DataType,
        delayMs: number,
    ): Promise<Job<DataType, ResultType, NameType>> {
        nonNegativeInteger(delayMs, 'delayMs');
        return this.addJob<DataType, ResultType, NameType>(queueName, jobName, data, { delay: delayMs });
    }

    addRepeatableJob<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        queueName: string,
        jobName: NameType,
        data: DataType,
        pattern: string,
    ): Promise<Job<DataType, ResultType, NameType>> {
        const repeatPattern = validateSingleLineString(pattern, 'repeat pattern');
        return this.addJob<DataType, ResultType, NameType>(queueName, jobName, data, {
            repeat: { pattern: repeatPattern },
        });
    }

    /** Create or retrieve a managed worker. Supply a distinct id for multiple workers on one queue. */
    createWorker<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        queueName: string,
        processor: JobProcessor<DataType, ResultType, NameType>,
        options: BullMQWorkerOptions = {},
    ): Worker<DataType, ResultType, NameType> {
        this.assertRunning();
        const name = validateQueueName(queueName);
        if (typeof processor !== 'function') {
            throw new BullMQRequestError('processor must be a function');
        }
        validateOptionalObject(options, 'worker options');
        rejectWorkerOwnedOptions(options);
        const { id, ...overrides } = options;
        const workerId = validateSingleLineString(id ?? name, 'worker id');
        const existing = this.workers.get(workerId);
        if (existing) {
            if (existing.queueName !== name) {
                throw new BullMQWorkerConflictError(workerId, existing.queueName, name);
            }
            this.logger.warn(`Worker '${workerId}' for queue '${name}' already exists`);
            return existing.worker as Worker<DataType, ResultType, NameType>;
        }

        const workerOptions: WorkerOptions = {
            ...this.options.workerOptions,
            ...overrides,
            connection: this.options.connection,
            ...(this.options.prefix && { prefix: this.options.prefix }),
        };
        if (workerOptions.concurrency !== undefined) {
            positiveInteger(workerOptions.concurrency, 'worker concurrency');
        }

        const worker = new Worker<DataType, ResultType, NameType>(
            name,
            async (job, token, signal) => {
                this.logger.debug(`Processing job '${job.name}' in queue '${name}'`);
                try {
                    return await processor(job, token, signal);
                } catch (error) {
                    this.logger.error(`Job '${job.name}' failed: ${errorMessage(error)}`);
                    throw error;
                }
            },
            workerOptions,
        );
        worker.on('completed', job => this.logger.debug(`Job '${job.name}' completed`));
        worker.on('failed', (job, error) =>
            this.logger.error(`Job '${job?.name ?? 'unknown'}' failed: ${errorMessage(error)}`),
        );
        worker.on('error', error => this.logger.error(`Worker '${workerId}' error: ${errorMessage(error)}`));
        this.workers.set(workerId, { queueName: name, worker });
        this.logger.log(`Worker '${workerId}' for queue '${name}' created`);
        return worker;
    }

    getWorker<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        workerId: string,
    ): Worker<DataType, ResultType, NameType> | undefined {
        this.assertRunning();
        const id = validateSingleLineString(workerId, 'worker id');
        return this.workers.get(id)?.worker as Worker<DataType, ResultType, NameType> | undefined;
    }

    closeWorker(workerId: string, force = false): Promise<boolean> {
        return this.runOperation(async () => {
            const id = validateSingleLineString(workerId, 'worker id');
            if (typeof force !== 'boolean') {
                throw new BullMQRequestError('force must be a boolean');
            }
            const managed = this.workers.get(id);
            if (!managed) {
                return false;
            }
            await managed.worker.close(force);
            if (this.workers.get(id) === managed) {
                this.workers.delete(id);
            }
            this.logger.debug(`Worker '${id}' closed`);
            return true;
        });
    }

    /** Get or create the single owned QueueEvents instance for a queue. */
    getQueueEvents(queueName: string): QueueEvents {
        this.assertRunning();
        const name = validateQueueName(queueName);
        const existing = this.queueEvents.get(name);
        if (existing) {
            return existing;
        }

        const eventOptions: QueueEventsOptions = {
            ...this.options.queueEventsOptions,
            connection: this.options.connection,
            ...(this.options.prefix && { prefix: this.options.prefix }),
        };
        const events = new QueueEvents(name, eventOptions);
        events.on('error', error => this.logger.error(`QueueEvents '${name}' error: ${errorMessage(error)}`));
        this.queueEvents.set(name, events);
        return events;
    }

    getQueueMetrics(queueName: string): Promise<QueueMetrics> {
        return this.runOperation(async () => {
            const queue = this.getQueue(queueName);
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
            ]);
            return { waiting, active, completed, failed, delayed };
        });
    }

    pauseQueue(queueName: string): Promise<void> {
        return this.runOperation(async () => {
            const queue = this.getQueue(queueName);
            await queue.pause();
            this.logger.log(`Queue '${queue.name}' paused`);
        });
    }

    resumeQueue(queueName: string): Promise<void> {
        return this.runOperation(async () => {
            const queue = this.getQueue(queueName);
            await queue.resume();
            this.logger.log(`Queue '${queue.name}' resumed`);
        });
    }

    /** Remove waiting jobs. Delayed jobs are retained unless includeDelayed is true. */
    removeWaitingJobs(queueName: string, includeDelayed = false): Promise<void> {
        return this.runOperation(async () => {
            if (typeof includeDelayed !== 'boolean') {
                throw new BullMQRequestError('includeDelayed must be a boolean');
            }
            const queue = this.getQueue(queueName);
            await queue.drain(includeDelayed);
            this.logger.log(
                `Waiting jobs removed from queue '${queue.name}'${includeDelayed ? ', including delayed jobs' : ''}`,
            );
        });
    }

    /** @deprecated Use removeWaitingJobs; BullMQ drain removes jobs instead of processing them. */
    drainQueue(queueName: string, includeDelayed = false): Promise<void> {
        return this.removeWaitingJobs(queueName, includeDelayed);
    }

    cleanQueue(
        queueName: string,
        grace = 24 * 60 * 60 * 1000,
        status: BullMQCleanStatus = 'completed',
        limit = 100,
    ): Promise<string[]> {
        return this.runOperation(async () => {
            nonNegativeInteger(grace, 'grace');
            positiveInteger(limit, 'limit');
            if (!CLEAN_STATUSES.has(status)) {
                throw new BullMQRequestError(`Unsupported clean status: ${String(status)}`);
            }
            return this.getQueue(queueName).clean(grace, limit, status);
        });
    }

    removeJob(queueName: string, jobId: string, options?: { removeChildren?: boolean }): Promise<boolean> {
        return this.runOperation(async () => {
            const id = validateSingleLineString(jobId, 'job id');
            validateOptionalObject(options, 'remove options');
            if (options?.removeChildren !== undefined && typeof options.removeChildren !== 'boolean') {
                throw new BullMQRequestError('removeChildren must be a boolean');
            }
            const removed = await this.getQueue(queueName).remove(id, options);
            return removed > 0;
        });
    }

    getJob<DataType = JobData, ResultType = unknown, NameType extends string = string>(
        queueName: string,
        jobId: string,
    ): Promise<Job<DataType, ResultType, NameType> | undefined> {
        return this.runOperation(async () => {
            const id = validateSingleLineString(jobId, 'job id');
            const queue = this.getQueue<DataType, ResultType, NameType>(queueName);
            return (await queue.getJob(id)) as Job<DataType, ResultType, NameType> | undefined;
        });
    }

    healthCheck(queueName = 'bullmq-health'): Promise<BullMQHealthResult> {
        return this.runOperation(async () => {
            const queue = this.getQueue(validateQueueName(queueName));
            const startedAt = Date.now();
            const result = await settleWithin(queue.waitUntilReady(), this.options.healthTimeoutMs);
            const latencyMs = Date.now() - startedAt;
            if (result.status === 'fulfilled') {
                return { healthy: true, queue: queue.name, latencyMs };
            }
            const error =
                result.status === 'timeout'
                    ? `Connection readiness timed out after ${this.options.healthTimeoutMs}ms`
                    : errorMessage(result.reason);
            return { healthy: false, queue: queue.name, latencyMs, error };
        });
    }

    getStats(): BullMQServiceStats {
        return {
            queues: this.queues.size,
            workers: this.workers.size,
            queueEvents: this.queueEvents.size,
            activeOperations: this.inFlightOperations.size,
            closing: this.closing,
        };
    }

    close(): Promise<void> {
        if (!this.closePromise) {
            this.closing = true;
            this.closePromise = this.closeResources();
        }
        return this.closePromise;
    }

    onModuleDestroy(): Promise<void> {
        return this.close();
    }

    private async closeResources(): Promise<void> {
        const errors: unknown[] = [];
        const deadline = Date.now() + this.options.shutdownTimeoutMs;
        this.logger.log('Closing BullMQ resources...');

        await this.waitForOperations(deadline, errors);
        const workerActions = [...this.workers].map<ShutdownAction>(([id, managed]) => ({
            label: `worker '${id}'`,
            run: () => managed.worker.close(false),
        }));
        const workersClosed = await this.runShutdownActions(workerActions, deadline, errors, 'closing workers');
        if (!workersClosed && this.options.forceWorkerCloseOnTimeout) {
            const forceActions = [...this.workers].map<ShutdownAction>(([id, managed]) => ({
                label: `worker '${id}' force close`,
                run: () => managed.worker.close(true),
            }));
            await this.runShutdownActions(forceActions, deadline, errors, 'force-closing workers');
        }

        await this.runShutdownActions(
            [...this.queueEvents].map<ShutdownAction>(([name, events]) => ({
                label: `QueueEvents '${name}'`,
                run: () => events.close(),
            })),
            deadline,
            errors,
            'closing queue event listeners',
        );
        await this.runShutdownActions(
            [...this.queues].map<ShutdownAction>(([name, queue]) => ({
                label: `queue '${name}'`,
                run: () => queue.close(),
            })),
            deadline,
            errors,
            'closing queues',
        );

        this.workers.clear();
        this.queueEvents.clear();
        this.queues.clear();
        if (errors.length > 0) {
            this.logger.error(`BullMQ shutdown completed with ${errors.length} error(s)`);
            throw new BullMQShutdownError(errors);
        }
        this.logger.log('BullMQ resources closed');
    }

    private async waitForOperations(deadline: number, errors: unknown[]): Promise<void> {
        const operations = [...this.inFlightOperations];
        if (operations.length === 0) {
            return;
        }
        const result = await settleWithin(Promise.allSettled(operations), remainingMs(deadline));
        if (result.status === 'timeout') {
            errors.push(new Error(`Timed out waiting for ${operations.length} BullMQ operation(s)`));
        } else if (result.status === 'rejected') {
            errors.push(
                new Error('Failed while waiting for BullMQ operations', {
                    cause: result.reason,
                }),
            );
        }
    }

    private async runShutdownActions(
        actions: ShutdownAction[],
        deadline: number,
        errors: unknown[],
        phase: string,
    ): Promise<boolean> {
        if (actions.length === 0) {
            return true;
        }
        const result = await settleWithin(
            Promise.allSettled(actions.map(action => invoke(action.run))),
            remainingMs(deadline),
        );
        if (result.status === 'timeout') {
            errors.push(new Error(`Timed out ${phase} after ${this.options.shutdownTimeoutMs}ms total shutdown time`));
            return false;
        }
        if (result.status === 'rejected') {
            errors.push(new Error(`Failed ${phase}`, { cause: result.reason }));
            return false;
        }
        result.value.forEach((settlement, index) => {
            if (settlement.status === 'rejected') {
                errors.push(
                    new Error(`Failed to close ${actions[index].label}`, {
                        cause: settlement.reason,
                    }),
                );
            }
        });
        return true;
    }

    private runOperation<T>(operation: () => Promise<T>): Promise<T> {
        this.assertRunning();
        const task = invoke(operation);
        this.inFlightOperations.add(task);
        void task.then(
            () => this.inFlightOperations.delete(task),
            () => this.inFlightOperations.delete(task),
        );
        return task;
    }

    private assertRunning(): void {
        if (this.closing) {
            throw new BullMQServiceClosedError();
        }
    }
}

function validateQueueName(value: unknown): string {
    const name = validateSingleLineString(value, 'queue name');
    if (name.includes(':')) {
        throw new BullMQRequestError('queue name cannot contain :');
    }
    return name;
}

function validateJobName<NameType extends string>(value: NameType): NameType {
    validateSingleLineString(value, 'job name');
    return value;
}

function validateSingleLineString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
        throw new BullMQRequestError(`${name} must be a non-empty, trimmed, single-line string`);
    }
    return value;
}

function validateOptionalObject(value: unknown, name: string): void {
    if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        throw new BullMQRequestError(`${name} must be an object`);
    }
}

function rejectWorkerOwnedOptions(options: object): void {
    for (const field of ['connection', 'prefix']) {
        if (Object.getOwnPropertyDescriptor(options, field) !== undefined) {
            throw new BullMQRequestError(`worker options.${field} is managed by the service`);
        }
    }
}

function positiveInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new BullMQRequestError(`${name} must be a positive safe integer`);
    }
    return value as number;
}

function nonNegativeInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new BullMQRequestError(`${name} must be a non-negative safe integer`);
    }
    return value as number;
}

function remainingMs(deadline: number): number {
    return Math.max(0, deadline - Date.now());
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function invoke<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return operation();
    } catch (error) {
        return Promise.reject(error);
    }
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
