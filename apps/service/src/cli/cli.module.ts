import { ConsoleModule } from '@nestify/console';
import { Module } from '@nestjs/common';
import { SeederModule } from '../seeder';
import { MongoCommand } from './commands';

@Module({
    imports: [
        ConsoleModule,
        SeederModule
    ],
    providers: [MongoCommand]
})
export class CliModule { }
