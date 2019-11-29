import { Module } from '@nestjs/common';
import { ConsoleModule } from '../console.module';
import { Command } from './command';

@Module({
    imports: [ConsoleModule],
    providers: [Command]
})
export class ConsoleModuleTest {}
