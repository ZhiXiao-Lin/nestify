import { type DynamicModule, type FactoryProvider, Module } from '@nestjs/common';
import {
    createMigrationModuleOptions,
    type MigrationModuleAsyncOptions,
    type MigrationModuleOptions,
    validateMigrationModuleAsyncOptions,
} from './migration-options';
import { MIGRATION_MODULE_OPTIONS, MigrationRunner } from './migration-runner';

@Module({})
export class MigrationModule {
    static register(options: MigrationModuleOptions): DynamicModule {
        const normalizedOptions = createMigrationModuleOptions(options);

        return {
            module: MigrationModule,
            global: normalizedOptions.isGlobal,
            providers: [{ provide: MIGRATION_MODULE_OPTIONS, useValue: normalizedOptions }, MigrationRunner],
            exports: [MigrationRunner, MIGRATION_MODULE_OPTIONS],
        };
    }

    static registerAsync(options: MigrationModuleAsyncOptions): DynamicModule {
        validateMigrationModuleAsyncOptions(options);

        const optionsProvider: FactoryProvider = {
            provide: MIGRATION_MODULE_OPTIONS,
            inject: options.inject ?? [],
            useFactory: async (...args: Parameters<MigrationModuleAsyncOptions['useFactory']>) =>
                createMigrationModuleOptions({
                    ...(await options.useFactory(...args)),
                    isGlobal: options.isGlobal,
                }),
        };

        return {
            module: MigrationModule,
            global: options.isGlobal ?? false,
            imports: options.imports,
            providers: [optionsProvider, MigrationRunner],
            exports: [MigrationRunner, MIGRATION_MODULE_OPTIONS],
        };
    }
}
