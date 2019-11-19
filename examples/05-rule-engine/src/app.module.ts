import { EventBusModule } from '@nestify/event-bus';
import { RuleEngineModule } from '@nestify/rule-engine';
import { Module } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppSubscriber } from './app.subscriber';

const event = new EventEmitter();
@Module({
  imports: [
    EventBusModule.register({ event }),
    RuleEngineModule.register({
      event,
      eventPrefix: 'rule',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppSubscriber],
})
export class AppModule { }
