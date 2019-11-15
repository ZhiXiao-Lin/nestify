import { EventBusModule } from '@nestify/event-bus';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppSubscriber } from './app.subscriber';

@Module({
  imports: [
    EventBusModule.registerAsync({
      useFactory: async () => {
        return {};
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppSubscriber],
})
export class AppModule {}
