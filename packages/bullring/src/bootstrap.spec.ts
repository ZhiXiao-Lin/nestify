import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createBullModule } from './bull';
import { BullModuleOptions } from './bull/bull.interfaces';

async function bootstrap(options: BullModuleOptions) {
    const bullModule = createBullModule(options);
    const app = await NestFactory.create(bullModule);

    app.enableCors({ origin: '*' });
    app.useGlobalPipes(new ValidationPipe());

    await app.listen(options.listenOptions.port, options.listenOptions.host || 'localhost', async () => {
        console.info(
            `Bullring is listening at http://${options.listenOptions.host}:` +
                options.listenOptions.port +
                '/' +
                options.listenOptions.basePath
        );
    });
}
bootstrap({
    listenOptions: {
        basePath: 'tasks',
        host: '0.0.0.0',
        port: 10010
    },
    queues: [
        {
            name: '{hotel}',
            options: {
                redis: {
                    host: '127.0.0.1',
                    port: 63711
                },
                limiter: {
                    max: 200,
                    duration: 1000
                }
            }
        },
        {
            name: '{scenic}',
            options: {
                redis: {
                    host: '127.0.0.1',
                    port: 63711
                },
                limiter: {
                    max: 200,
                    duration: 1000
                }
            }
        }
    ]
});
