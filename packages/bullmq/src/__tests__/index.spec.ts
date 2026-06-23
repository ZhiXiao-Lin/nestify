import { BULLMQ_OPTIONS_TOKEN } from '../bullmq.module-definition';
import { BullMQModule } from '../bullmq.module';
import { BullMQService } from '../bullmq.service';

const mockQueueInstances: Array<Record<string, any>> = [];
const mockWorkerInstances: Array<Record<string, any>> = [];
const mockQueueEventInstances: Array<Record<string, any>> = [];

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation((name, options) => {
        const queue = {
            name,
            options,
            add: jest.fn(async (jobName, data, jobOptions) => ({ id: 'job-1', name: jobName, data, opts: jobOptions })),
            getWaitingCount: jest.fn(async () => 1),
            getActiveCount: jest.fn(async () => 2),
            getCompletedCount: jest.fn(async () => 3),
            getFailedCount: jest.fn(async () => 4),
            getDelayedCount: jest.fn(async () => 5),
            pause: jest.fn(async () => undefined),
            resume: jest.fn(async () => undefined),
            drain: jest.fn(async () => undefined),
            clean: jest.fn(async () => ['job-1']),
            getJob: jest.fn(async (id: string) => ({ id, remove: jest.fn(async () => undefined) })),
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
            close: jest.fn(async () => undefined),
        };
        mockQueueEventInstances.push(events);
        return events;
    }),
}));

describe('bullmq package', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQueueInstances.length = 0;
        mockWorkerInstances.length = 0;
        mockQueueEventInstances.length = 0;
    });

    it('exports static and async Nest module registrations', () => {
        const options = { connection: { host: 'localhost', port: 6379 } };
        const staticModule = BullMQModule.register(options);
        const asyncModule = BullMQModule.registerAsync({
            useFactory: () => options,
            inject: [],
        });

        expect(staticModule.module).toBe(BullMQModule);
        expect(staticModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: BULLMQ_OPTIONS_TOKEN, useValue: options }),
                BullMQService,
            ]),
        );
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: BULLMQ_OPTIONS_TOKEN, useFactory: expect.any(Function) }),
                BullMQService,
            ]),
        );
    });

    it('creates queues with connection, defaults, and prefix', async () => {
        const service = new BullMQService({
            connection: { host: 'cache', port: 6380 },
            defaultJobOptions: { attempts: 2 },
            prefix: 'api',
        });

        const queue = service.getQueue('tasks') as any;
        const sameQueue = service.getQueue('tasks');
        const job = await service.addJob('tasks', 'process', { resourceId: 'resource-1' });

        expect(sameQueue).toBe(queue);
        expect(queue.options).toEqual({
            connection: { host: 'cache', port: 6380 },
            defaultJobOptions: { attempts: 2 },
            prefix: 'api',
        });
        expect(queue.add).toHaveBeenCalledWith(
            'process',
            { resourceId: 'resource-1' },
            expect.objectContaining({
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
            }),
        );
        expect(job).toMatchObject({ id: 'job-1', name: 'process' });
    });

    it('creates workers, wraps processors, and reuses existing workers', async () => {
        const service = new BullMQService({
            connection: { host: 'cache', port: 6379 },
            prefix: 'api',
        });

        const worker = service.createWorker('tasks', async job => ({ success: true, data: job.data }), {
            concurrency: 5,
        }) as any;
        const sameWorker = service.createWorker('tasks', async () => ({ success: true }));
        const result = await mockWorkerInstances[0].processor({ name: 'process', data: { ok: true } });

        expect(sameWorker).toBe(worker);
        expect(worker.options).toEqual({
            connection: { host: 'cache', port: 6379 },
            concurrency: 5,
            prefix: 'api',
        });
        expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function));
        expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
        expect(result).toEqual({ success: true, data: { ok: true } });
    });

    it('reports metrics and closes managed resources', async () => {
        const service = new BullMQService({
            connection: { host: 'cache', port: 6379 },
            prefix: 'api',
        });

        const queue = service.getQueue('tasks') as any;
        const events = service.getQueueEvents('tasks') as any;
        const worker = service.createWorker('tasks', async () => ({ success: true })) as any;

        await expect(service.getQueueMetrics('tasks')).resolves.toEqual({
            waiting: 1,
            active: 2,
            completed: 3,
            failed: 4,
            delayed: 5,
        });
        expect(events.options).toEqual({ connection: { host: 'cache', port: 6379 }, prefix: 'api' });

        await service.onModuleDestroy();

        expect(worker.close).toHaveBeenCalled();
        expect(queue.close).toHaveBeenCalled();
        expect(events.close).toHaveBeenCalled();
    });
});
