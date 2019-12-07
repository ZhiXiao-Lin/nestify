import { ConsoleModule } from '@nestify/console';
import { SeederModule } from '@nestify/mongo-seeder';
import { Module } from '@nestjs/common';
import { MongoCommand } from './commands';

@Module({
    imports: [ConsoleModule, SeederModule],
    providers: [MongoCommand]
})
export class CliModule {}
