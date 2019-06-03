import * as pidusage from 'pidusage';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval, Timeout, NestSchedule } from 'nest-schedule';
import { influx } from '../lib/influx';


@Injectable()
export class MonitorTask extends NestSchedule {

    // # ┌────────────── second (optional)
    // # │ ┌──────────── minute
    // # │ │ ┌────────── hour
    // # │ │ │ ┌──────── day of month
    // # │ │ │ │ ┌────── month
    // # │ │ │ │ │ ┌──── day of week
    // # │ │ │ │ │ │
    // # │ │ │ │ │ │
    // # * * * * * *

    // @Cron('2 * * * * *')
    // async cronJob() {
    //     Logger.log('定时任务');

    //     const status = await pidusage(process.pid);
    //     Logger.log(status);
    // }

    // @Timeout(5000)
    // onceJob() {
    //     Logger.log('延时任务');
    // }

    @Interval(5000)
    async intervalJob() {
        const status = await pidusage(process.pid);

        await influx.writePoints([{
            measurement: 'system_status',
            tags: { status: 'status' },
            fields: status,
            timestamp: new Date()
        }]);

        // const res = await influx.query(`select * from system_status order by time desc limit 10`);

        // Logger.log(res);

        return false;
    }
}