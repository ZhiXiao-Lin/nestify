import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createBullModule } from './bull';

async function bootstrap(options: any) {

    const bullModule = createBullModule(options);
    const app = await NestFactory.create(bullModule);

    app.setGlobalPrefix(options.listenOptions.prefix);
    app.enableCors({ origin: '*' });

    app.useGlobalPipes(new ValidationPipe());

    await app.listen(options.listenOptions.port, async () => {
        console.info(
            'Bullring is listening at http://localhost:' + options.listenOptions.port + '/' + options.listenOptions.prefix
        );
    });
}
bootstrap({
    listenOptions: {
        prefix: 'tasks',
        port: 10010
    },
    queues: [
        {
            name: '{hotel}',
            hostId: 'hotel',
            options: {
                redis: {
                    host: '127.0.0.1',
                    port: '63790'
                },
                limiter: {
                    max: 200,
                    duration: 1000
                }
            }
        }
    ]
});
