import { ILoggerService, LOGGER_SERVICE } from '@nestify/logger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { inspect } from 'util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger: ILoggerService = app.get(LOGGER_SERVICE);

  const port = 3000;
  const prefix = 'api';

  await app.listen(port, () => {
    logger.info('Listening at http://localhost:' + port + '/' + prefix + ' 🚀');
  });
}
bootstrap();
