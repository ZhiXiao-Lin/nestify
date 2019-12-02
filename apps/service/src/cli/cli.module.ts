import { ConsoleModule } from '@nestify/console';
import { Module } from '@nestjs/common';
import { SeederModule } from '../seeder';
import { MongoCommand } from './commands';
import { AdminSeeder } from './seeders';

@Module({
    imports: [ConsoleModule, SeederModule],
    providers: [MongoCommand, AdminSeeder]
})
export class CliModule { }
