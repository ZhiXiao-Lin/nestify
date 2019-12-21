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

    public getQueue(name: string): Queue {
        return this.queuesMap.get(name);
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
