import type { KyselyService } from '@a3s-lab/kysely';
import { Logger } from '@nestjs/common';
import { type Migration, type MigrationProvider, type MigrationResultSet, Migrator } from 'kysely';
import {
    MigrationExecutionError,
    type MigrationModuleOptions,
    MigrationRunner,
    shouldAutoRunMigrations,
} from '../index';

describe('MigrationRunner', () => {
    const db = { name: 'database' } as unknown as KyselyService<unknown>;
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const migrateToLatest = jest.spyOn(Migrator.prototype, 'migrateToLatest');

    beforeEach(() => {
        log.mockClear();
        warn.mockClear();
        error.mockClear();
        migrateToLatest.mockReset();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('does not run during bootstrap without an explicit opt-in', async () => {
        const runner = createRunner(db, { autoRun: false });

        await runner.onApplicationBootstrap();

        expect(migrateToLatest).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
    });

    it('logs the empty and successful result paths and returns the Kysely result set', async () => {
        const emptyResult: MigrationResultSet = { results: [] };
        const successResult: MigrationResultSet = {
            results: [{ migrationName: '20260101_create_table', direction: 'Up', status: 'Success' }],
        };
        migrateToLatest.mockResolvedValueOnce(emptyResult).mockResolvedValueOnce(successResult);
        const runner = createRunner(db);

        await expect(runner.runMigrations()).resolves.toBe(emptyResult);
        await expect(runner.runMigrations()).resolves.toBe(successResult);

        expect(log).toHaveBeenCalledWith('No pending migrations');
        expect(log).toHaveBeenCalledWith('Migration "20260101_create_table" executed successfully');
    });

    it('coalesces concurrent executions and permits a later explicit run', async () => {
        const deferred = createDeferred<MigrationResultSet>();
        migrateToLatest.mockReturnValueOnce(deferred.promise).mockResolvedValueOnce({ results: [] });
        const runner = createRunner(db);

        const first = runner.runMigrations();
        const second = runner.runMigrations();
        expect(migrateToLatest).toHaveBeenCalledTimes(1);

        deferred.resolve({ results: [] });
        await Promise.all([first, second]);
        await runner.runMigrations();

        expect(migrateToLatest).toHaveBeenCalledTimes(2);
    });

    it('throws and logs the exact Kysely error, including falsy non-undefined values', async () => {
        const migrationError = new Error('database unavailable');
        migrateToLatest.mockResolvedValueOnce({
            error: migrationError,
            results: [{ migrationName: 'bad\nname', direction: 'Up', status: 'Error' }],
        });
        const runner = createRunner(db);

        await expect(runner.runMigrations()).rejects.toBe(migrationError);
        expect(error).toHaveBeenCalledWith('Migration "bad\\nname" failed', migrationError.stack);

        migrateToLatest.mockResolvedValueOnce({ error: null });
        let caught: unknown = Symbol('not-thrown');
        try {
            await runner.runMigrations();
        } catch (thrown) {
            caught = thrown;
        }
        expect(caught).toBeNull();
        expect(error).toHaveBeenCalledWith('Migration failed before execution completed', 'null');
    });

    it.each([
        ['Error', 'failed without an error value'],
        ['NotExecuted', 'was not executed without an error value'],
    ] as const)('fails closed for an inconsistent %s result', async (status, message) => {
        migrateToLatest.mockResolvedValue({
            results: [{ migrationName: '20260101_incomplete', direction: 'Up', status }],
        });

        await expect(createRunner(db).runMigrations()).rejects.toThrow(MigrationExecutionError);
        await expect(createRunner(db).runMigrations()).rejects.toThrow(message);

        if (status === 'Error') {
            expect(error).toHaveBeenCalledWith('Migration "20260101_incomplete" failed without an error value');
        } else {
            expect(warn).toHaveBeenCalledWith('Migration "20260101_incomplete" was not executed');
        }
    });
});

describe('automatic migration policy', () => {
    const options = { migrationFolder: 'src/migrations' };

    it('is disabled by default, including in production', () => {
        expect(shouldAutoRunMigrations(options, {})).toBe(false);
        expect(shouldAutoRunMigrations(options, { NODE_ENV: 'production' })).toBe(false);
    });

    it('gives an explicit module option highest precedence', () => {
        expect(shouldAutoRunMigrations({ ...options, autoRun: true }, {})).toBe(true);
        expect(
            shouldAutoRunMigrations(
                { ...options, autoRun: false, autoRunInProduction: true },
                { AUTO_MIGRATE: 'true', NODE_ENV: 'production' },
            ),
        ).toBe(false);
    });

    it('uses only the exact AUTO_MIGRATE value when it is present', () => {
        expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'true' })).toBe(true);
        expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'false' })).toBe(false);
        expect(shouldAutoRunMigrations(options, { AUTO_MIGRATE: 'TRUE' })).toBe(false);
    });

    it('requires a production-only module opt-in without an environment override', () => {
        expect(shouldAutoRunMigrations({ ...options, autoRunInProduction: true }, { NODE_ENV: 'production' })).toBe(
            true,
        );
        expect(shouldAutoRunMigrations({ ...options, autoRunInProduction: true }, { NODE_ENV: 'development' })).toBe(
            false,
        );
    });
});

function createRunner(db: KyselyService<unknown>, overrides: Partial<MigrationModuleOptions> = {}): MigrationRunner {
    return new MigrationRunner(db, {
        provider: createProvider({}),
        autoRun: true,
        ...overrides,
    });
}

function createProvider(migrations: Record<string, Migration>): MigrationProvider {
    return {
        getMigrations: jest.fn().mockResolvedValue(migrations),
    };
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolvePromise: ((value: T) => void) | undefined;
    const promise = new Promise<T>(resolve => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve: value => resolvePromise?.(value),
    };
}
