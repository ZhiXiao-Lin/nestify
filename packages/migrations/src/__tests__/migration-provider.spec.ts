import { FileMigrationProvider, type Kysely, type Migration, type MigrationProvider, Migrator } from 'kysely';
import {
    ConcurrentSafeMigrationProvider,
    createFileMigrationProvider,
    createMigrator,
    MigrationConfigurationError,
    NON_TRANSACTIONAL_MIGRATION_NAME,
} from '../index';

describe('migration providers', () => {
    const outerDb = { name: 'outer' } as unknown as Kysely<unknown>;
    const migratorDb = { name: 'migrator' } as unknown as Kysely<unknown>;

    it('matches only the default concurrent migration name segment', () => {
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_create_index_concurrent')).toBe(true);
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_concurrent_add_index')).toBe(true);
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_create_table')).toBe(false);
        expect(NON_TRANSACTIONAL_MIGRATION_NAME.test('20260101_concurrently_add_index')).toBe(false);
    });

    it('runs named non-transactional migrations against the outer database', async () => {
        const normalUp = jest.fn();
        const concurrentUp = jest.fn();
        const concurrentDown = jest.fn();
        const delegate = createProvider({
            '20260101_create_table': { up: normalUp },
            '20260102_add_index_concurrent': { up: concurrentUp, down: concurrentDown },
        });

        const migrations = await new ConcurrentSafeMigrationProvider(delegate, outerDb).getMigrations();
        await migrations['20260101_create_table'].up(migratorDb);
        await migrations['20260102_add_index_concurrent'].up(migratorDb);
        await migrations['20260102_add_index_concurrent'].down?.(migratorDb);

        expect(normalUp).toHaveBeenCalledWith(migratorDb);
        expect(concurrentUp).toHaveBeenCalledWith(outerDb);
        expect(concurrentDown).toHaveBeenCalledWith(outerDb);
        expect(migrations['20260101_create_table'].down).toBeUndefined();
    });

    it('makes global and sticky custom patterns deterministic across names and calls', async () => {
        const first = jest.fn();
        const second = jest.fn();
        const pattern = /(^|_)outside(_|$)/gi;
        pattern.lastIndex = 7;
        const provider = new ConcurrentSafeMigrationProvider(
            createProvider({
                '20260101_outside_index': { up: first },
                '20260102_outside_constraint': { up: second },
            }),
            outerDb,
            pattern,
        );

        for (const migrations of [await provider.getMigrations(), await provider.getMigrations()]) {
            await migrations['20260101_outside_index'].up(migratorDb);
            await migrations['20260102_outside_constraint'].up(migratorDb);
        }

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(2);
        expect(first).toHaveBeenCalledWith(outerDb);
        expect(second).toHaveBeenCalledWith(outerDb);
        expect(pattern.lastIndex).toBe(7);
    });

    it('keeps special migration names as own properties', async () => {
        const up = jest.fn();
        const migrations = Object.create(null) as Record<string, Migration>;
        migrations.__proto__ = { up };

        const wrapped = await new ConcurrentSafeMigrationProvider(createProvider(migrations), outerDb).getMigrations();

        expect(Object.hasOwn(wrapped, '__proto__')).toBe(true);
        expect(Object.getPrototypeOf(wrapped)).toBe(Object.prototype);
        await wrapped.__proto__.up(migratorDb);
        expect(up).toHaveBeenCalledWith(migratorDb);
    });

    it('supports custom providers and file providers when creating a migrator', () => {
        const provider = createProvider({});

        expect(createFileMigrationProvider({ migrationFolder: './dist/migrations' })).toBeInstanceOf(
            FileMigrationProvider,
        );
        expect(createMigrator(outerDb, { provider })).toBeInstanceOf(Migrator);
        expect(createMigrator(outerDb, { provider, wrapNonTransactionalMigrations: false })).toBeInstanceOf(Migrator);
        expect(createMigrator(outerDb, { migrationFolder: './dist/migrations' })).toBeInstanceOf(Migrator);
    });

    it('rejects invalid delegate and name pattern values', () => {
        expect(() => new ConcurrentSafeMigrationProvider({} as never, outerDb)).toThrow(MigrationConfigurationError);
        expect(() => new ConcurrentSafeMigrationProvider(createProvider({}), outerDb, 'concurrent' as never)).toThrow(
            MigrationConfigurationError,
        );
    });
});

function createProvider(migrations: Record<string, Migration>): MigrationProvider {
    return {
        getMigrations: jest.fn().mockResolvedValue(migrations),
    };
}
