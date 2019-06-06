import * as pidusage from 'pidusage';
import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Client } from 'socket.io';
import { Cron, Interval, Timeout, NestSchedule } from 'nest-schedule';
import { influx } from '../lib/influx';
import { config } from '../../config';

@WebSocketGateway(config.websocket.port, { namespace: 'status' })
export class StatusTask extends NestSchedule {

    @WebSocketServer() server: any;

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

    @Interval(3000)
    async pushStatus() {
        const status = await influx.query(`select * from system_status order by time desc limit 30`);
        this.server.emit('status', status);
    }

    @Interval(3000)
    async intervalJob() {
        const status = await pidusage(process.pid);

        await influx.writePoints([{
            measurement: 'system_status',
            tags: { status: 'status' },
            fields: status,
            timestamp: new Date()
        }]);

        return false;
    }
}