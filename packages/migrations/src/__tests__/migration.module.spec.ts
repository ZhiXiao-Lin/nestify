import type { FactoryProvider, ValueProvider } from '@nestjs/common';
import { MIGRATION_MODULE_OPTIONS, MigrationConfigurationError, MigrationModule, MigrationRunner } from '../index';

describe('MigrationModule', () => {
    it('registers normalized options and remains scoped by default', () => {
        const module = MigrationModule.register({ migrationFolder: './dist/migrations', autoRun: false });
        const provider = module.providers?.[0] as ValueProvider;

        expect(module.global).toBe(false);
        expect(provider.provide).toBe(MIGRATION_MODULE_OPTIONS);
        expect(provider.useValue).toEqual({
            migrationFolder: './dist/migrations',
            provider: undefined,
            wrapNonTransactionalMigrations: true,
            nonTransactionalNamePattern: undefined,
            autoRun: false,
            autoRunInProduction: false,
            isGlobal: false,
        });
        expect(module.providers).toContain(MigrationRunner);
        expect(module.exports).toEqual([MigrationRunner, MIGRATION_MODULE_OPTIONS]);
    });

    it('supports global synchronous registration', () => {
        expect(MigrationModule.register({ migrationFolder: 'migrations', isGlobal: true }).global).toBe(true);
    });

    it('supports validated asynchronous configuration', async () => {
        class ConfigModule {}
        const factory = jest.fn((folder: string) => ({ migrationFolder: folder, autoRun: true }));
        const module = MigrationModule.registerAsync({
            imports: [ConfigModule],
            inject: ['MIGRATION_FOLDER'],
            useFactory: factory,
            isGlobal: true,
        });
        const provider = module.providers?.[0] as FactoryProvider;

        expect(module.global).toBe(true);
        expect(module.imports).toEqual([ConfigModule]);
        expect(provider.inject).toEqual(['MIGRATION_FOLDER']);
        await expect(provider.useFactory('./async/migrations')).resolves.toEqual({
            migrationFolder: './async/migrations',
            provider: undefined,
            wrapNonTransactionalMigrations: true,
            nonTransactionalNamePattern: undefined,
            autoRun: true,
            autoRunInProduction: false,
            isGlobal: true,
        });
        expect(factory).toHaveBeenCalledWith('./async/migrations');
    });

    it('validates both registration paths before Nest bootstraps', async () => {
        expect(() => MigrationModule.register({})).toThrow(MigrationConfigurationError);
        expect(() => MigrationModule.registerAsync({} as never)).toThrow(MigrationConfigurationError);

        const module = MigrationModule.registerAsync({ useFactory: () => ({ migrationFolder: '' }) });
        const provider = module.providers?.[0] as FactoryProvider;
        await expect(provider.useFactory()).rejects.toThrow(MigrationConfigurationError);
    });
});
