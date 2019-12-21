import { Controller, Get, Inject, Param, BadRequestException } from '@nestjs/common';
import * as Bull from 'bull';
import { BULL_OPTIONS } from './bull.constants';
import { BullModuleOptions } from './bull.interfaces';
import { BullService } from './bull.service';

export function createBullController(basePath: string = 'bull'): any {
    @Controller(basePath)
    class BullController {
        constructor(
            @Inject(BULL_OPTIONS)
            private readonly options: BullModuleOptions,
            private readonly service: BullService
        ) {}

        @Get()
        getQueues() {
            return this.options.queues;
        }

        @Get('jobs/:queueName')
        async getJobs(@Param('queueName') queueName: string) {
            const queue = this.service.getQueue(queueName);

            if (!queue) throw new BadRequestException(`Queue ${queueName} does not exist`);

            return await queue.getJobCounts();
        }
    }

    return BullController;
}
