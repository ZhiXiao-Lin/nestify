import { ConfigModule, ConfigService } from '@nestify/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  ConfigModule.initEnvironment();

  const app = await NestFactory.create(AppModule);
  const config: ConfigService = app.get(ConfigService);

  await app.listen(config.get('app.port'), () => {
    Logger.log(`port: ${config.get('app.port')}`);
  });
}
bootstrap();
