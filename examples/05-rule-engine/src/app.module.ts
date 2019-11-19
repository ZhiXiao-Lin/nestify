import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RuleEngineModule } from '@nestify/rule-engine';

@Module({
  imports: [
    RuleEngineModule.register({})
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
