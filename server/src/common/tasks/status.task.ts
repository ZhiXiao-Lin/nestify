import { stat } from 'fs';
import { resolve, basename, dirname, extname } from 'path';
import * as pidusage from 'pidusage';
import * as chokidar from 'chokidar';
import * as moment from 'moment';
import { Cron, Interval, Timeout, NestSchedule } from 'nest-schedule';
import { Logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { es } from '../lib/es';
import { IOServer } from '../lib/io';

export class StatusTask extends NestSchedule {
    server: any = IOServer.status;

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

    async watchFiles() {
        const uploadDirPath = resolve('./static');
        Logger.log(`watching ${uploadDirPath}`);

        chokidar.watch(uploadDirPath, { ignored: /(^|[\/\\])\../ }).on('all', (event, path) => {
            stat(path, (err, stats) => {
                Logger.log(event, path, stats);

                const info = { index: 'uploads', type: 'uploads' };

                switch (event) {
                    case 'add':
                        es.index({
                            ...info,
                            id: path,
                            body: {
                                baseName: basename(path),
                                dirName: dirname(path),
                                extName: extname(path),
                                path,
                                type: 'file',
                                stat: stats
                            }
                        });
                        break;
                    case 'addDir':
                        es.index({
                            ...info,
                            id: path,
                            body: {
                                baseName: basename(path),
                                dirName: dirname(path),
                                extName: extname(path),
                                path,
                                type: 'dir',
                                stat: stats
                            }
                        });
                        break;
                    case 'change':
                        es.update({
                            ...info,
                            id: path,
                            body: {
                                baseName: basename(path),
                                dirName: dirname(path),
                                extName: extname(path),
                                path,
                                type: 'dir',
                                stat: stats
                            }
                        });
                        break;
                    case 'unlink':
                        es.delete({
                            ...info,
                            id: path
                        });
                        break;
                    case 'unlinkDir':
                        es.delete({
                            ...info,
                            id: path
                        });
                        break;
                }
            });
        });
    }

    @Interval(2000)
    async pushStatus() {
        const status = await pidusage(process.pid);

        const statusJson = await redis.get('system_status');

        let statusArr = [];

        if (!!statusJson) {
            statusArr = JSON.parse(statusJson);
        }

        status.time = moment().valueOf();
        statusArr.unshift(status);

        if (statusArr.length > 30) {
            statusArr = statusArr.splice(0, 30);
        }

        await redis.set('system_status', JSON.stringify(statusArr));

        this.server.emit('status', statusArr);

        return false;
    }
}
