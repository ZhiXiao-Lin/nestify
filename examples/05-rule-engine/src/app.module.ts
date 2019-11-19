import { EventBusModule, EventBusService } from '@nestify/event-bus';
import {
  RuleEngineModule,
  RuleEngineModuleOptions,
} from '@nestify/rule-engine';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventEmitter } from 'events';

@Module({
  imports: [
    EventBusModule.register(),
    RuleEngineModule.registerAsync({
      useFactory: (eb: EventBusService): RuleEngineModuleOptions => {
        return {
          event: new EventEmitter(),
          eventPrefix: 'rule',
        };
      },
      inject: [],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
