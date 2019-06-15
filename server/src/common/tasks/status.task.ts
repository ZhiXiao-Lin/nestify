import { stat } from 'fs';
import { resolve, basename, dirname, extname } from 'path';
import * as pidusage from 'pidusage';
import * as chokidar from 'chokidar';
import { Cron, Interval, Timeout, NestSchedule } from 'nest-schedule';
import { influx } from '../lib/influx';
import { Logger } from '../lib/logger';
import { es } from '../lib/elastic-search';
import { io } from '../lib/io';

export class StatusTask extends NestSchedule {
    server: any;

    constructor() {
        super();

        this.server = io.server.of('/status');
        this.server.use((socket, next) => {
            Logger.log('/status ---> id', socket.id);
            next();
        });
        // this.watchFiles();
    }

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

    @Interval(3000)
    async pushStatus() {
        if (!this.server) return false;

        const status = await influx.query(
            `select * from system_status order by time desc limit 30`
        );
        this.server.emit('status', status);
    }

    @Interval(3000)
    async intervalJob() {
        const status = await pidusage(process.pid);

        await influx.writePoints([
            {
                measurement: 'system_status',
                tags: { status: 'status' },
                fields: status,
                timestamp: new Date()
            }
        ]);

        return false;
    }
}
