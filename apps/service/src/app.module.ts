import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BllModule } from './bll';
import { CommonModule } from './common';

@Module({
    imports: [CommonModule, BllModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
