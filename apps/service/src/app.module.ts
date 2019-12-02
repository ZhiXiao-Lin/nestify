import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BllModule } from './bll';
import { CliModule } from './cli';
import { CommonModule } from './common';

@Module({
    imports: [CommonModule, CliModule, BllModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule { }
