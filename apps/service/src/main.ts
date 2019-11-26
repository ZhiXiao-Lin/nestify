import { ConfigModule, IConfigService } from '@nestify/config';
import { ILoggerService } from '@nestify/logger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG_SERVICE, LOGGER_SERVICE } from './common';

async function bootstrap() {

  ConfigModule.initEnvironment(process.cwd() + '/src/env');

  const app = await NestFactory.create(AppModule);

  const config: IConfigService = app.get(CONFIG_SERVICE);
  const logger: ILoggerService = app.get(LOGGER_SERVICE);

  const port = 3000;
  const prefix = 'api';

  await app.listen(port, () => {
    logger.info('NODE_ENV', config.get('app.env'));
    logger.info('Listening at http://localhost:' + port + '/' + prefix + ' 🚀');
  });
}
bootstrap();
