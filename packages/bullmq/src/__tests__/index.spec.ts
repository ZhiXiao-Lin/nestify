import { Logger } from '@nestjs/common';
import { BullMQModule } from '../bullmq.module';
import { BULLMQ_OPTIONS_TOKEN } from '../bullmq.module-definition';
import { BullMQService } from '../bullmq.service';
import {
    type BullMQModuleOptions,
    BullMQRequestError,
    BullMQServiceClosedError,
    BullMQShutdownError,
    BullMQWorkerConflictError,
} from '../bullmq.types';

const mockQueueInstances: Array<Record<string, any>> = [];
const mockWorkerInstances: Array<Record<string, any>> = [];
const mockQueueEventInstances: Array<Record<string, any>> = [];

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation((name, options) => {
        const queue = {
            name,
            options,
            on: jest.fn(),
            add: jest.fn(async (jobName, data, jobOptions) => ({
                id: 'job-1',
                name: jobName,
                data,
                opts: jobOptions,
            })),
            getWaitingCount: jest.fn(async () => 1),
            getActiveCount: jest.fn(async () => 2),
            getCompletedCount: jest.fn(async () => 3),
            getFailedCount: jest.fn(async () => 4),
            getDelayedCount: jest.fn(async () => 5),
            pause: jest.fn(async () => undefined),
            resume: jest.fn(async () => undefined),
            drain: jest.fn(async () => undefined),
            clean: jest.fn(async () => ['job-1']),
            remove: jest.fn(async () => 1),
            getJob: jest.fn(async (id: string) => ({ id })),
            waitUntilReady: jest.fn(async () => ({ status: 'ready' })),
            close: jest.fn(async () => undefined),
        };
        mockQueueInstances.push(queue);
        return queue;
    }),
    Worker: jest.fn().mockImplementation((name, processor, options) => {
        const worker = {
            name,
            processor,
            options,
            on: jest.fn(),
            close: jest.fn(async () => undefined),
        };
        mockWorkerInstances.push(worker);
        return worker;
    }),
    QueueEvents: jest.fn().mockImplementation((name, options) => {
        const events = {
            name,
            options,
            on: jest.fn(),
            close: jest.fn(async () => undefined),
        };
        mockQueueEventInstances.push(events);
        return events;
    }),
}));

describe('bullmq package', () => {
    beforeAll(() => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockQueueInstances.length = 0;
        mockWorkerInstances.length = 0;
        mockQueueEventInstances.length = 0;
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('exports static and async Nest module registrations', () => {
        const options = { connection: { host: 'localhost', port: 6379 } };
        const staticModule = BullMQModule.register(options);
        const factory = () => options;
        const asyncModule = BullMQModule.registerAsync({
            imports: [],
            useFactory: factory,
            inject: [],
        });

        expect(staticModule.module).toBe(BullMQModule);
        expect(staticModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: BULLMQ_OPTIONS_TOKEN, useValue: options }),
                BullMQService,
            ]),
        );
        expect(asyncModule.imports).toEqual([]);
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: BULLMQ_OPTIONS_TOKEN, useFactory: factory, inject: [] }),
                BullMQService,
            ]),
        );
    });

    it('creates and caches queues with advanced options and an error listener', () => {
        const service = createService({
            prefix: 'api',
            defaultJobOptions: { attempts: 2 },
            queueOptions: { skipVersionCheck: true },
        });

        const queue = service.getQueue('tasks') as any;
        expect(service.getQueue('tasks')).toBe(queue);
        expect(queue.options).toEqual({
            connection: { host: 'cache', port: 6379 },
            defaultJobOptions: { attempts: 2 },
            prefix: 'api',
            skipVersionCheck: true,
        });
        expect(queue.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(service.getStats()).toMatchObject({ queues: 1, closing: false });
    });

    it('preserves queue-level defaults when job options are omitted', async () => {
        const service = createService({ defaultJobOptions: { attempts: 7 } });

        const job = await service.addJob('tasks', 'process', { resourceId: 'resource-1' });
        const queue = mockQueueInstances[0];

        expect(queue.add).toHaveBeenCalledWith('process', { resourceId: 'resource-1' }, undefined);
        expect(job).toMatchObject({ id: 'job-1', name: 'process' });
        expect(service.getStats().activeOperations).toBe(0);
    });

    it('passes explicit SDK job options and builds delayed and repeatable jobs', async () => {
        const service = createService();
        await service.addJob('tasks', 'direct', { ok: true }, { attempts: 4, priority: 2 });
        await service.addDelayedJob('tasks', 'later', { ok: true }, 500);
        await service.addRepeatableJob('tasks', 'scheduled', { ok: true }, '*/5 * * * *');

        const add = mockQueueInstances[0].add;
        expect(add).toHaveBeenNthCalledWith(1, 'direct', { ok: true }, { attempts: 4, priority: 2 });
        expect(add).toHaveBeenNthCalledWith(2, 'later', { ok: true }, { delay: 500 });
        expect(add).toHaveBeenNthCalledWith(3, 'scheduled', { ok: true }, { repeat: { pattern: '*/5 * * * *' } });
    });

    it('validates queue, job, repeat, delay, and job option inputs', async () => {
        const service = createService();

        expect(() => service.getQueue('bad:name')).toThrow(BullMQRequestError);
        expect(() => service.getQueue(' tasks ')).toThrow(BullMQRequestError);
        await expect(service.addJob('tasks', '' as string, {}, undefined)).rejects.toBeInstanceOf(BullMQRequestError);
        await expect(service.addJob('tasks', 'job', {}, null as never)).rejects.toBeInstanceOf(BullMQRequestError);
        expect(() => service.addDelayedJob('tasks', 'job', {}, -1)).toThrow(BullMQRequestError);
        expect(() => service.addRepeatableJob('tasks', 'job', {}, '\n')).toThrow(BullMQRequestError);
    });

    it('returns processor results directly and forwards BullMQ cancellation arguments', async () => {
        const service = createService({
            prefix: 'api',
            workerOptions: { concurrency: 2, autorun: false },
        });
        const processor = jest.fn(async (_job, token?: string, signal?: AbortSignal) => ({
            token,
            aborted: signal?.aborted,
        }));
        const worker = service.createWorker('tasks', processor, { id: 'primary', concurrency: 5 }) as any;
        const signal = new AbortController().signal;
        const job = { name: 'process', data: { ok: true } };

        await expect(worker.processor(job, 'lock-token', signal)).resolves.toEqual({
            token: 'lock-token',
            aborted: false,
        });
        expect(processor).toHaveBeenCalledWith(job, 'lock-token', signal);
        expect(worker.options).toEqual({
            autorun: false,
            concurrency: 5,
            connection: { host: 'cache', port: 6379 },
            prefix: 'api',
        });
        expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function));
        expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
        expect(worker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('allows multiple worker ids, reuses an id, and rejects cross-queue conflicts', () => {
        const service = createService();
        const first = service.createWorker('tasks', async () => 'first', { id: 'worker-a' });
        const second = service.createWorker('tasks', async () => 'second', { id: 'worker-b' });

        expect(second).not.toBe(first);
        expect(service.createWorker('tasks', async () => 'ignored', { id: 'worker-a' })).toBe(first);
        expect(service.getWorker('worker-b')).toBe(second);
        expect(() => service.createWorker('other', async () => 'bad', { id: 'worker-a' })).toThrow(
            BullMQWorkerConflictError,
        );
        expect(service.getStats().workers).toBe(2);
    });

    it('logs and rethrows processor failures', async () => {
        const service = createService();
        const failure = new Error('processor failed');
        const worker = service.createWorker('tasks', async () => {
            throw failure;
        }) as any;

        await expect(worker.processor({ name: 'process' })).rejects.toBe(failure);
        expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('processor failed'));
    });

    it('validates worker inputs and closes individual workers', async () => {
        const service = createService();
        expect(() => service.createWorker('tasks', null as never)).toThrow(BullMQRequestError);
        expect(() => service.createWorker('tasks', async () => undefined, { concurrency: 0 })).toThrow(
            BullMQRequestError,
        );
        expect(() =>
            service.createWorker('tasks', async () => undefined, {
                connection: { host: 'other', port: 6379 },
            } as never),
        ).toThrow('worker options.connection is managed by the service');
        expect(() => service.getWorker(' worker ')).toThrow(BullMQRequestError);

        const worker = service.createWorker('tasks', async () => undefined, { id: 'worker-a' }) as any;
        await expect(service.closeWorker('missing')).resolves.toBe(false);
        await expect(service.closeWorker('worker-a', true)).resolves.toBe(true);
        expect(worker.close).toHaveBeenCalledWith(true);
        expect(service.getWorker('worker-a')).toBeUndefined();
        await expect(service.closeWorker('missing', 'yes' as never)).rejects.toBeInstanceOf(BullMQRequestError);
    });

    it('creates and caches queue events with advanced options', () => {
        const service = createService({
            prefix: 'api',
            queueEventsOptions: { autorun: false, blockingTimeout: 2_000 },
        });
        const events = service.getQueueEvents('tasks') as any;

        expect(service.getQueueEvents('tasks')).toBe(events);
        expect(events.options).toEqual({
            autorun: false,
            blockingTimeout: 2_000,
            connection: { host: 'cache', port: 6379 },
            prefix: 'api',
        });
        expect(events.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('reports metrics and controls queue state', async () => {
        const service = createService();

        await expect(service.getQueueMetrics('tasks')).resolves.toEqual({
            waiting: 1,
            active: 2,
            completed: 3,
            failed: 4,
            delayed: 5,
        });
        await service.pauseQueue('tasks');
        await service.resumeQueue('tasks');

        expect(mockQueueInstances[0].pause).toHaveBeenCalledTimes(1);
        expect(mockQueueInstances[0].resume).toHaveBeenCalledTimes(1);
    });

    it('makes destructive drain semantics explicit and validates cleanup', async () => {
        const service = createService();

        await service.removeWaitingJobs('tasks');
        await service.drainQueue('tasks', true);
        await expect(service.cleanQueue('tasks', 0, 'failed', 25)).resolves.toEqual(['job-1']);

        const queue = mockQueueInstances[0];
        expect(queue.drain).toHaveBeenNthCalledWith(1, false);
        expect(queue.drain).toHaveBeenNthCalledWith(2, true);
        expect(queue.clean).toHaveBeenCalledWith(0, 25, 'failed');
        await expect(service.removeWaitingJobs('tasks', 'yes' as never)).rejects.toBeInstanceOf(BullMQRequestError);
        await expect(service.cleanQueue('tasks', -1)).rejects.toBeInstanceOf(BullMQRequestError);
        await expect(service.cleanQueue('tasks', 0, 'unknown' as never)).rejects.toBeInstanceOf(BullMQRequestError);
        await expect(service.cleanQueue('tasks', 0, 'completed', 0)).rejects.toBeInstanceOf(BullMQRequestError);
    });

    it('gets and atomically removes jobs', async () => {
        const service = createService();

        await expect(service.getJob('tasks', 'job-1')).resolves.toEqual({ id: 'job-1' });
        await expect(service.removeJob('tasks', 'job-1', { removeChildren: true })).resolves.toBe(true);
        mockQueueInstances[0].remove.mockResolvedValueOnce(0);
        await expect(service.removeJob('tasks', 'missing')).resolves.toBe(false);
        expect(mockQueueInstances[0].remove).toHaveBeenCalledWith('job-1', { removeChildren: true });
        await expect(service.removeJob('tasks', '', {})).rejects.toBeInstanceOf(BullMQRequestError);
        await expect(service.removeJob('tasks', 'job', { removeChildren: 'yes' } as never)).rejects.toBeInstanceOf(
            BullMQRequestError,
        );
    });

    it('reports healthy and failed readiness checks', async () => {
        const service = createService();
        await expect(service.healthCheck('health')).resolves.toMatchObject({ healthy: true, queue: 'health' });

        mockQueueInstances[0].waitUntilReady.mockRejectedValueOnce(new Error('redis unavailable'));
        await expect(service.healthCheck('health')).resolves.toMatchObject({
            healthy: false,
            queue: 'health',
            error: 'redis unavailable',
        });
    });

    it('bounds readiness checks with a timeout', async () => {
        jest.useFakeTimers();
        try {
            const service = createService({ healthTimeoutMs: 25 });
            await expect(service.healthCheck('health')).resolves.toMatchObject({ healthy: true });
            const stalledQueue = service.getQueue('other') as any;
            stalledQueue.waitUntilReady.mockReturnValueOnce(new Promise(() => undefined));
            const secondCheck = service.healthCheck('other');

            await jest.advanceTimersByTimeAsync(25);
            await expect(secondCheck).resolves.toMatchObject({
                healthy: false,
                error: 'Connection readiness timed out after 25ms',
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('waits for in-flight operations before idempotently closing all resource groups', async () => {
        const service = createService();
        service.getQueueEvents('tasks');
        service.createWorker('tasks', async () => undefined);
        const queue = service.getQueue('tasks') as any;
        const deferred = createDeferred<unknown>();
        queue.add.mockReturnValueOnce(deferred.promise);
        const operation = service.addJob('tasks', 'process', {});

        const firstClose = service.close();
        const secondClose = service.close();
        expect(secondClose).toBe(firstClose);
        expect(queue.close).not.toHaveBeenCalled();
        expect(() => service.getQueue('other')).toThrow(BullMQServiceClosedError);

        deferred.resolve({ id: 'job-1', name: 'process' });
        await operation;
        await firstClose;

        expect(mockWorkerInstances[0].close).toHaveBeenCalledWith(false);
        expect(mockQueueEventInstances[0].close).toHaveBeenCalledTimes(1);
        expect(queue.close).toHaveBeenCalledTimes(1);
        expect(service.getStats()).toEqual({
            queues: 0,
            workers: 0,
            queueEvents: 0,
            activeOperations: 0,
            closing: true,
        });
        await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('attempts every resource close and aggregates failures', async () => {
        const service = createService();
        const firstQueue = service.getQueue('first') as any;
        const secondQueue = service.getQueue('second') as any;
        const events = service.getQueueEvents('first') as any;
        const worker = service.createWorker('first', async () => undefined) as any;
        worker.close.mockRejectedValueOnce(new Error('worker close failed'));
        firstQueue.close.mockRejectedValueOnce(new Error('queue close failed'));

        await expect(service.close()).rejects.toMatchObject({
            name: 'BullMQShutdownError',
            errors: expect.arrayContaining([expect.any(Error), expect.any(Error)]),
        });
        expect(events.close).toHaveBeenCalledTimes(1);
        expect(secondQueue.close).toHaveBeenCalledTimes(1);
    });

    it('force-closes workers when graceful shutdown exceeds the total budget', async () => {
        jest.useFakeTimers();
        try {
            const service = createService({ shutdownTimeoutMs: 20 });
            const worker = service.createWorker('tasks', async () => undefined) as any;
            worker.close.mockImplementation((force?: boolean) =>
                force ? Promise.resolve() : new Promise(() => undefined),
            );

            const closing = expect(service.close()).rejects.toBeInstanceOf(BullMQShutdownError);
            await jest.advanceTimersByTimeAsync(20);
            await jest.runAllTimersAsync();

            await closing;
            expect(worker.close).toHaveBeenCalledWith(false);
            expect(worker.close).toHaveBeenCalledWith(true);
            expect(mockQueueInstances).toHaveLength(0);
        } finally {
            jest.useRealTimers();
        }
    });
});

function createService(overrides: Partial<BullMQModuleOptions> = {}): BullMQService {
    return new BullMQService({
        connection: { host: 'cache', port: 6379 },
        ...overrides,
    });
}

function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
} {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
