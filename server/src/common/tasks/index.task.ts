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
        Logger.log('执行定时任务');
    }

    @Timeout(5000)
    onceJob() {
        Logger.log('执行延时任务');
    }

    @Interval(2000)
    intervalJob() {
        Logger.log('执行间隔任务' + this.i + '次');
        return this.i++ > 4;
    }
}