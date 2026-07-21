import type { Kysely, Migration, MigrationProvider } from 'kysely';
import {
    ConcurrentSafeMigrationProvider,
    MIGRATION_MODULE_OPTIONS,
    MigrationModule,
    MigrationRunner,
    NON_TRANSACTIONAL_MIGRATION_NAME,
    shouldAutoRunMigrations,
} from '../index';

describe('migration helpers', () => {
    it('matches concurrent migration names', () => {
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_create_index_concurrent')).toBe(true);
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_concurrent_add_index')).toBe(true);
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_create_table')).toBe(false);
    });

    it('wraps concurrent migrations so they run against the outer db', async () => {
        const outerDb = { name: 'outer' } as unknown as Kysely<unknown>;
        const migratorDb = { name: 'migrator' } as unknown as Kysely<unknown>;
        const normalUp = jest.fn();
        const concurrentUp = jest.fn();
        const concurrentDown = jest.fn();
        const delegate = createProvider({
            '20260101_create_table': { up: normalUp },
            '20260102_add_index_concurrent': { up: concurrentUp, down: concurrentDown },
        });

        const provider = new ConcurrentSafeMigrationProvider(delegate, outerDb);
        const migrations = await provider.getMigrations();

        await migrations['20260101_create_table'].up(migratorDb);
        await migrations['20260102_add_index_concurrent'].up(migratorDb);
        await migrations['20260102_add_index_concurrent'].down?.(migratorDb);

        expect(normalUp).toHaveBeenCalledWith(migratorDb);
        expect(concurrentUp).toHaveBeenCalledWith(outerDb);
        expect(concurrentDown).toHaveBeenCalledWith(outerDb);
    });

    it('can disable wrapping for custom name patterns', async () => {
        const outerDb = { name: 'outer' } as unknown as Kysely<unknown>;
        const migratorDb = { name: 'migrator' } as unknown as Kysely<unknown>;
        const up = jest.fn();
        const delegate = createProvider({
            '20260101_add_index_concurrent': { up },
        });

        const provider = new ConcurrentSafeMigrationProvider(delegate, outerDb, /never-match/);
        const migrations = await provider.getMigrations();

        await migrations['20260101_add_index_concurrent'].up(migratorDb);

        expect(up).toHaveBeenCalledWith(migratorDb);
    });

    it('registers migration runner and options as Nest providers', () => {
        const options = { migrationFolder: 'src/migrations', autoRun: false };

        expect(MigrationModule.register(options)).toEqual({
            module: MigrationModule,
            providers: [{ provide: MIGRATION_MODULE_OPTIONS, useValue: options }, MigrationRunner],
            exports: [MigrationRunner, MIGRATION_MODULE_OPTIONS],
        });
    });

    describe('automatic migration policy', () => {
        const options = { migrationFolder: 'src/migrations' };

        it('is disabled by default, including in production', () => {
            expect(shouldAutoRunMigrations(options, {})).toBe(false);
            expect(shouldAutoRunMigrations(options, { NODE_ENV: 'production' })).toBe(false);
        });

        it('allows an explicit module option to enable or disable startup migrations', () => {
            expect(shouldAutoRunMigrations({ ...options, autoRun: true }, {})).toBe(true);
            expect(
                shouldAutoRunMigrations(
                    { ...options, autoRun: false, autoRunInProduction: true },
                    { AUTO_MIGRATE: 'true', NODE_ENV: 'production' },
                ),
            ).toBe(false);
        });

        it('uses the exact AUTO_MIGRATE value when no module override is present', () => {
            expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'true' })).toBe(true);
            expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'false' })).toBe(false);
            expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'TRUE' })).toBe(false);
        });

        it('requires an explicit production opt-in when no environment override is present', () => {
            expect(shouldAutoRunMigrations({ ...options, autoRunInProduction: true }, { NODE_ENV: 'production' })).toBe(
                true,
            );
            expect(
                shouldAutoRunMigrations({ ...options, autoRunInProduction: true }, { NODE_ENV: 'development' }),
            ).toBe(false);
        });
    });
});

function createProvider(migrations: Record<string, Migration>): MigrationProvider {
    return {
        getMigrations: jest.fn().mockResolvedValue(migrations),
    };
}
