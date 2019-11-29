import { ConsoleModule } from '@nestify/console';
import { Module } from '@nestjs/common';
import { SeedCommand } from './commands';

@Module({
    imports: [ConsoleModule],
    providers: [SeedCommand]
})
export class CommandModule { }