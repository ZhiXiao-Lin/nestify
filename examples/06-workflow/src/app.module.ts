import { WorkFlowModule } from '@nestify/workflow';
import { Module } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    WorkFlowModule.register({
      event: new EventEmitter(),
      eventPrefix: 'workflow',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
