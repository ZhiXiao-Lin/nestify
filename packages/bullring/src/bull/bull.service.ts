import { Inject, Injectable } from '@nestjs/common';
import * as Bull from 'bull';
import { Queue } from 'bull';
import { BULL_OPTIONS } from './bull.constants';
import { BullModuleOptions, BullQueueOptions } from './bull.interfaces';

@Injectable()
export class BullService {
    private readonly queuesMap: Map<string, Queue>;

    constructor(
        @Inject(BULL_OPTIONS)
        private readonly options: BullModuleOptions
    ) {
        this.queuesMap = new Map<string, Queue>();
        this.create(this.options.queues);
    }

    public async getQueues(): Promise<Queue[]> {
        const queues: Queue[] = [];
        for (let q of this.queuesMap.values()) {
            await q.client.info();
            queues.push(q);
        }
        return queues;
    }

    public async getQueue(name: string): Promise<Queue> {

        const queue = this.queuesMap.get(name);
        if (!queue) return null;

        await queue.client.info();

        return queue;
    }

    private create(queueOptions: Array<BullQueueOptions>) {
        queueOptions.forEach((options) => {
            this.register(options.name, new Bull(options.name, options.options));
        });
    }

    private register(key: string, queue: Queue) {
        this.queuesMap.set(key, queue);
        return this;
    }
}
