# @a3s-lab/bullmq

Lifecycle-safe NestJS integration for BullMQ queues, workers, queue events, metrics, health checks, and administrative operations.

## Install

```bash
pnpm add @a3s-lab/bullmq @nestjs/common bullmq
```

## Use

Register a connection configuration or an existing BullMQ-compatible ioredis client. Queue, worker, and queue-event settings use the first-party BullMQ SDK types.

```ts
import { Module } from '@nestjs/common';
import { BullMQModule, createBullMQModuleOptions } from '@a3s-lab/bullmq';

@Module({
    imports: [
        BullMQModule.register(
            createBullMQModuleOptions({
                connection: {
                    host: 'localhost',
                    port: 6379,
                },
                prefix: 'orders',
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1_000 },
                    removeOnComplete: true,
                },
                workerOptions: {
                    concurrency: 4,
                },
                shutdownTimeoutMs: 10_000,
            }),
        ),
    ],
})
export class AppModule {}
```

Async registration requires a factory, so a module cannot silently start without options:

```ts
BullMQModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        connection: {
            host: config.getOrThrow('REDIS_HOST'),
            port: config.getOrThrow('REDIS_PORT'),
        },
    }),
});
```

### Add jobs

`addJob` forwards explicit `JobsOptions` unchanged. When the options argument is omitted, BullMQ applies the queue's `defaultJobOptions`; the service does not inject a hidden retry policy.

```ts
import { Injectable } from '@nestjs/common';
import { BullMQService } from '@a3s-lab/bullmq';

interface RebuildSearchIndex {
    tenantId: string;
}

@Injectable()
export class SearchJobs {
    constructor(private readonly queues: BullMQService) {}

    enqueue(data: RebuildSearchIndex) {
        return this.queues.addJob('search', 'rebuild-index', data);
    }

    enqueueUrgent(data: RebuildSearchIndex) {
        return this.queues.addJob('search', 'rebuild-index', data, { priority: 1 });
    }
}
```

### Run workers

Processors return their result directly, matching BullMQ's `Processor` contract. The lock token and `AbortSignal` are forwarded so application code can cooperate with cancellation. A worker id is local to this service; distinct ids allow multiple workers for the same queue.

```ts
interface RebuildResult {
    indexed: number;
}

const primary = queues.createWorker<RebuildSearchIndex, RebuildResult>(
    'search',
    async (job, _token, signal) => {
        const indexed = await rebuildIndex(job.data.tenantId, { signal });
        return { indexed };
    },
    { id: 'search-primary', concurrency: 8 },
);

const lowPriority = queues.createWorker<RebuildSearchIndex, RebuildResult>(
    'search',
    async job => ({ indexed: await rebuildIndex(job.data.tenantId) }),
    { id: 'search-low-priority', concurrency: 2 },
);
```

Calling `createWorker` again with the same id and queue returns the existing worker. Reusing an id for a different queue throws `BullMQWorkerConflictError`. Use `getWorker(id)` or `closeWorker(id, force)` for explicit worker management.

### Observe health and queue state

```ts
const metrics = await queues.getQueueMetrics('search');
const health = await queues.healthCheck('search');
const events = queues.getQueueEvents('search');

events.on('failed', ({ jobId, failedReason }) => {
    reportFailure(jobId, failedReason);
});
```

`healthCheck` bounds `Queue.waitUntilReady()` with `healthTimeoutMs` and returns `{ healthy, queue, latencyMs, error? }`. Queue and QueueEvents error listeners are installed before the resources are returned.

### Administrative operations

The service exposes `pauseQueue`, `resumeQueue`, `cleanQueue`, `getJob`, and atomic `removeJob` helpers. Destructive operations are named and documented explicitly:

```ts
// Removes waiting jobs. It does not process them.
await queues.removeWaitingJobs('search');

// Also remove delayed jobs.
await queues.removeWaitingJobs('search', true);

// Remove at most 500 failed jobs older than one day.
await queues.cleanQueue('search', 86_400_000, 'failed', 500);
```

`drainQueue` remains as a deprecated compatibility alias for `removeWaitingJobs`.

### Shutdown behavior

The service rejects new work as soon as shutdown begins, waits for already-started service operations, closes workers before QueueEvents and Queue instances, attempts every resource even when one close fails, and uses one total `shutdownTimeoutMs` budget. Repeated `close()` and Nest `onModuleDestroy()` calls share the same promise. By default, workers receive a force-close request if graceful shutdown exhausts the budget.

Shutdown failures are reported as `BullMQShutdownError` with an `errors` array and aggregate cause instead of being lost after the first failure.

## Exports

- `BullMQModule`, `BullMQService`, and module tokens
- `createBullMQModuleOptions`, `normalizeBullMQModuleOptions`, and normalized option types
- BullMQ-derived connection, queue, worker, queue-event, job, and processor types
- Queue metrics, health, service stats, cleanup status, and managed worker option types
- Structured configuration, request, lifecycle, worker-conflict, and shutdown errors

## Notes

The package owns resources created through `BullMQService` and closes them during Nest module teardown. Applications own queue names, payload schemas, retry policy, processor business logic, and authorization around destructive administrative methods. A raw Queue or Worker returned by the service must not be used after shutdown starts.
