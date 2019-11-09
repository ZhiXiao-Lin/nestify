import { ConfigModule } from '@nestify/config';
import { Module } from '@nestjs/common';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.register(
      path.resolve(__dirname, 'config', '**/!(*.d).{ts,js}'),
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
