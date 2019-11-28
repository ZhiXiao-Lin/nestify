import { IConfigService, ILoggerService } from '@nestify/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG_SERVICE, LOGGER_SERVICE } from './common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config: IConfigService = app.get(CONFIG_SERVICE);
    const logger: ILoggerService = app.get(LOGGER_SERVICE);

    const port = config.get('app.port');
    const prefix = config.get('app.prefix');

    app.setGlobalPrefix(prefix);
    app.enableCors(config.get('app.cors'));

    await app.listen(port, () => {
        logger.info('NODE_ENV', config.get('app.env'));
        logger.info('Listening at http://localhost:' + port + '/' + prefix + ' 🚀');
    });
}
bootstrap();
