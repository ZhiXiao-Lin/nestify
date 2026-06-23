import { DynamicModule, Module } from '@nestjs/common';
import { MIGRATION_MODULE_OPTIONS, MigrationModuleOptions, MigrationRunner } from './migration-runner';

@Module({})
export class MigrationModule {
    static register(options: MigrationModuleOptions): DynamicModule {
        return {
            module: MigrationModule,
            providers: [{ provide: MIGRATION_MODULE_OPTIONS, useValue: options }, MigrationRunner],
            exports: [MigrationRunner, MIGRATION_MODULE_OPTIONS],
        };
    }
}
