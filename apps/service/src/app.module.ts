import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common';

@Module({
  imports: [
    CommonModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
