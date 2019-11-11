import { LoggerModule } from '@nestify/logger';
import { Module } from '@nestjs/common';
import { transports } from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    LoggerModule.register({
      transports: [new transports.Console()],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
