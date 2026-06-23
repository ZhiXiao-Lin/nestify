# @a3s-lab/bullmq

NestJS module and service helpers for BullMQ-backed task queues.

## Install

```bash
pnpm add @a3s-lab/bullmq @nestjs/common bullmq
```

## Use

```ts
import { BullMQModule } from '@a3s-lab/bullmq';

@Module({
    imports: [
        BullMQModule.register({
            connection: {
                host: 'localhost',
                port: 6379,
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
            },
        }),
    ],
})
export class AppModule {}
```

Inject the service to add jobs and create workers:

```ts
import { Injectable } from '@nestjs/common';
import { BullMQService } from '@a3s-lab/bullmq';

@Injectable()
export class TaskService {
    constructor(private readonly queues: BullMQService) {}

    async enqueue(data: Record<string, unknown>) {
        await this.queues.addJob('tasks', 'process', data);
    }

    startWorker() {
        this.queues.createWorker('tasks', async job => {
            await processTask(job.data);
            return { success: true };
        });
    }
}
```

The package owns generic queue registration, worker lifecycle, queue metrics, and cleanup helpers. Applications still own queue names, job payloads, retry policy, and worker business logic.
