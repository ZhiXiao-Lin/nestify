import type { MigrationProvider } from 'kysely';
import {
    createMigrationModuleOptions,
    MigrationConfigurationError,
    normalizeCreateMigratorOptions,
    validateMigrationModuleAsyncOptions,
} from '../index';

describe('migration option validation', () => {
    const provider = createProvider();

    it('normalizes safe defaults and freezes the result', () => {
        const options = createMigrationModuleOptions({ migrationFolder: './dist/migrations' });

        expect(options).toEqual({
            migrationFolder: './dist/migrations',
            provider: undefined,
            wrapNonTransactionalMigrations: true,
            nonTransactionalNamePattern: undefined,
            autoRun: undefined,
            autoRunInProduction: false,
            isGlobal: false,
        });
        expect(Object.isFrozen(options)).toBe(true);
    });

    it('allows a custom provider without a migration folder', () => {
        expect(
            normalizeCreateMigratorOptions({
                provider,
                wrapNonTransactionalMigrations: false,
                nonTransactionalNamePattern: /outside-transaction/gi,
            }),
        ).toEqual({
            migrationFolder: undefined,
            provider,
            wrapNonTransactionalMigrations: false,
            nonTransactionalNamePattern: /outside-transaction/gi,
        });
    });

    it.each([
        ['missing options', undefined],
        ['missing folder and provider', {}],
        ['empty folder', { migrationFolder: '   ' }],
        ['null byte in folder', { migrationFolder: 'migrations\0outside' }],
        ['oversized folder', { migrationFolder: 'm'.repeat(4097) }],
        ['invalid provider', { provider: {} }],
        ['invalid wrapping flag', { migrationFolder: 'migrations', wrapNonTransactionalMigrations: 'yes' }],
        ['invalid name pattern', { migrationFolder: 'migrations', nonTransactionalNamePattern: 'concurrent' }],
    ])('rejects %s', (_name, options) => {
        expect(() => normalizeCreateMigratorOptions(options as never)).toThrow(MigrationConfigurationError);
    });

    it.each(['autoRun', 'autoRunInProduction', 'isGlobal'] as const)('rejects a non-boolean %s option', name => {
        expect(() => createMigrationModuleOptions({ migrationFolder: 'migrations', [name]: 'yes' } as never)).toThrow(
            MigrationConfigurationError,
        );
    });

    it('validates asynchronous registration metadata', () => {
        expect(() => validateMigrationModuleAsyncOptions(undefined as never)).toThrow(MigrationConfigurationError);
        expect(() => validateMigrationModuleAsyncOptions({} as never)).toThrow(MigrationConfigurationError);
        expect(() =>
            validateMigrationModuleAsyncOptions({ useFactory: () => ({ migrationFolder: 'migrations' }) }),
        ).not.toThrow();
        expect(() =>
            validateMigrationModuleAsyncOptions({
                isGlobal: 'yes' as never,
                useFactory: () => ({ migrationFolder: 'migrations' }),
            }),
        ).toThrow(MigrationConfigurationError);
    });
});

function createProvider(): MigrationProvider {
    return {
        getMigrations: jest.fn().mockResolvedValue({}),
    };
}
