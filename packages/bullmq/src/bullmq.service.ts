// ============================================================================
// BullMQ Service - Queue management and job processing
// ============================================================================

import { Inject, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { BullMQModuleOptions } from './bullmq.types';
import { BULLMQ_OPTIONS_TOKEN } from './bullmq.module-definition';

export interface JobData {
    [key: string]: unknown;
}

export interface JobResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

export type JobProcessor<T extends JobData = JobData> = (job: Job<T>) => Promise<JobResult>;

/**
 * Queue metrics for monitoring
 */
export interface QueueMetrics {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

@Injectable()
export class BullMQService implements OnModuleDestroy {
    private readonly queues: Map<string, Queue> = new Map();
    private readonly workers: Map<string, Worker> = new Map();
    private readonly queueEvents: Map<string, QueueEvents> = new Map();
    private readonly logger = new Logger(BullMQService.name);

    constructor(@Inject(BULLMQ_OPTIONS_TOKEN) private readonly options: BullMQModuleOptions) {}

    /**
     * Get or create a queue
     */
    getQueue(name: string): Queue {
        if (this.queues.has(name)) {
            return this.queues.get(name)!;
        }

        const queue = new Queue(name, {
            connection: this.options.connection,
            defaultJobOptions: this.options.defaultJobOptions,
        });

        this.queues.set(name, queue);
        this.logger.log(`Queue '${name}' created`);

        return queue;
    }

    /**
     * Add a job to a queue
     */
    async addJob<T extends JobData>(
        queueName: string,
        jobName: string,
        data: T,
        options?: {
            priority?: number;
            attempts?: number;
            backoff?: { type: 'exponential' | 'fixed'; delay: number };
            delay?: number;
            repeat?: { pattern: string } | { endDate: Date };
        },
    ): Promise<Job> {
        const queue = this.getQueue(queueName);

        const job = await queue.add(jobName, data, {
            priority: options?.priority,
            attempts: options?.attempts ?? 3,
            backoff: options?.backoff ?? { type: 'exponential', delay: 1000 },
            delay: options?.delay,
            repeat: options?.repeat,
        });

        this.logger.debug(`Job '${jobName}' added to queue '${queueName}'`);
        return job;
    }

    /**
     * Add a delayed job (runs after delay)
     */
    async addDelayedJob<T extends JobData>(
        queueName: string,
        jobName: string,
        data: T,
        delayMs: number,
    ): Promise<Job> {
        return this.addJob(queueName, jobName, data, { delay: delayMs });
    }

    /**
     * Add a repeatable job (cron-like)
     */
    async addRepeatableJob<T extends JobData>(
        queueName: string,
        jobName: string,
        data: T,
        pattern: string, // e.g., '*/5 * * * *'
    ): Promise<Job> {
        return this.addJob(queueName, jobName, data, {
            repeat: { pattern },
        });
    }

    /**
     * Create a worker for a queue
     */
    createWorker<T extends JobData = JobData>(
        queueName: string,
        processor: JobProcessor<T>,
        options?: { concurrency?: number },
    ): Worker {
        if (this.workers.has(queueName)) {
            this.logger.warn(`Worker for queue '${queueName}' already exists`);
            return this.workers.get(queueName)!;
        }

        const worker = new Worker<T>(
            queueName,
            async (job) => {
                this.logger.debug(`Processing job '${job.name}' in queue '${queueName}'`);
                try {
                    const result = await processor(job);
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    return result;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Job '${job.name}' failed: ${message}`);
                    throw error;
                }
            },
            {
                connection: this.options.connection,
                concurrency: options?.concurrency ?? 1,
            },
        );

        worker.on('completed', (job) => {
            this.logger.debug(`Job '${job.name}' completed`);
        });

        worker.on('failed', (job, error) => {
            this.logger.error(`Job '${job?.name}' failed: ${error.message}`);
        });

        this.workers.set(queueName, worker);
        this.logger.log(`Worker for queue '${queueName}' created`);

        return worker;
    }

    /**
     * Get queue events for monitoring
     */
    getQueueEvents(queueName: string): QueueEvents {
        if (this.queueEvents.has(queueName)) {
            return this.queueEvents.get(queueName)!;
        }

        const events = new QueueEvents(queueName, {
            connection: this.options.connection,
        });

        this.queueEvents.set(queueName, events);
        return events;
    }

    /**
     * Get queue metrics
     */
    async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
        const queue = this.getQueue(queueName);

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);

        return { waiting, active, completed, failed, delayed };
    }

    /**
     * Pause a queue
     */
    async pauseQueue(queueName: string): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.pause();
        this.logger.log(`Queue '${queueName}' paused`);
    }

    /**
     * Resume a queue
     */
    async resumeQueue(queueName: string): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.resume();
        this.logger.log(`Queue '${queueName}' resumed`);
    }

    /**
     * Drain a queue (process all waiting jobs)
     */
    async drainQueue(queueName: string): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.drain();
        this.logger.log(`Queue '${queueName}' drained`);
    }

    /**
     * Clean a queue (remove old jobs)
     */
    async cleanQueue(
        queueName: string,
        grace: number = 24 * 60 * 60 * 1000, // 24 hours
        status?: 'completed' | 'failed',
    ): Promise<string[]> {
        const queue = this.getQueue(queueName);
        return queue.clean(grace, 100, status ?? 'completed');
    }

    /**
     * Remove a specific job
     */
    async removeJob(queueName: string, jobId: string): Promise<void> {
        const queue = this.getQueue(queueName);
        const job = await queue.getJob(jobId);
        if (job) {
            await job.remove();
        }
    }

    /**
     * Get a job by ID
     */
    async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
        const queue = this.getQueue(queueName);
        return queue.getJob(jobId);
    }

    /**
     * Close all queues and workers
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('Closing BullMQ connections...');

        // Close all workers
        for (const [name, worker] of this.workers) {
            await worker.close();
            this.logger.debug(`Worker '${name}' closed`);
        }

        // Close all queues
        for (const [name, queue] of this.queues) {
            await queue.close();
            this.logger.debug(`Queue '${name}' closed`);
        }

        // Close all queue events
        for (const [, events] of this.queueEvents) {
            await events.close();
        }

        this.queues.clear();
        this.workers.clear();
        this.queueEvents.clear();

        this.logger.log('BullMQ connections closed');
    }
}
