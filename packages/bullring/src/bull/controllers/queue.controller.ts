import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { BullService } from '../bull.service';
import { CleanJobDto, GetJobsDto } from '../dtos';

export function createQueueController(basePath: string = 'bull'): any {
    @Controller(basePath)
    class QueueController {
        constructor(
            private readonly service: BullService
        ) { }

        @Get()
        getQueues() {
            return this.service.getQueues();
        }

        @Get(':queueName')
        async getClientInfo(@Param('queueName') queueName: string) {
            const queue = await this.service.getQueue(queueName);
            return queue;
        }

        @Get(':queueName/counts')
        async getCounts(@Param('queueName') queueName: string) {
            const queue = await this.service.getQueue(queueName);
            return await queue.getJobCounts();
        }

        @Get(':queueName/jobs')
        async getJobs(
            @Param('queueName') queueName: string,
            @Query() dto: GetJobsDto
        ) {
            const queue = await this.service.getQueue(queueName);
            return await queue.getJobs(dto.status, dto.start, dto.end, dto.asc);
        }

        @Delete(':queueName/clean')
        async clean(
            @Param('queueName') queueName: string,
            @Query() dto: CleanJobDto
        ) {
            const queue = await this.service.getQueue(queueName);
            return await queue.clean(dto.grace, dto.status, dto.limit);
        }

        @Delete(':queueName/empty')
        async empty(@Param('queueName') queueName: string) {
            const queue = await this.service.getQueue(queueName);
            return await queue.empty();
        }
    }

    return QueueController;
}
