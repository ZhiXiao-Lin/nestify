import { LOGGER_MODULE_PROVIDER } from '@nestify/logger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(LOGGER_MODULE_PROVIDER);

  const res = await app.listenAsync(3000);

  logger.info('logger');
  logger.info(res);
}
bootstrap();
