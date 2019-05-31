import * as pidusage from 'pidusage';
import * as util from 'util';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval, Timeout, NestSchedule } from 'nest-schedule';


@Injectable()
export class IndexTask extends NestSchedule {

    // # ┌────────────── second (optional)
    // # │ ┌──────────── minute
    // # │ │ ┌────────── hour
    // # │ │ │ ┌──────── day of month
    // # │ │ │ │ ┌────── month
    // # │ │ │ │ │ ┌──── day of week
    // # │ │ │ │ │ │
    // # │ │ │ │ │ │
    // # * * * * * *

    private i: number = 1;

    @Cron('2 * * * * *')
    async cronJob() {
        Logger.log('定时任务');

        const status = await pidusage(process.pid);
        Logger.log(status);
    }

    @Timeout(5000)
    onceJob() {
        Logger.log('延时任务');
    }

    @Interval(5000)
    async intervalJob() {
        Logger.log('间隔任务' + this.i + '次');

        const status = await pidusage(process.pid);
        Logger.log(status);

        return this.i++ > 4;
    }
}