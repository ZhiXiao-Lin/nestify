import { ConsoleModule } from '@nestify/console';
import { Module } from '@nestjs/common';
import { MongoCommand } from './commands';

@Module({
    imports: [ConsoleModule],
    providers: [MongoCommand]
})
export class CommandModule {}
