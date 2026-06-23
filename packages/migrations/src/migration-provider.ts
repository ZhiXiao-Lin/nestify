import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { FileMigrationProvider, Migrator, type Kysely, type Migration, type MigrationProvider } from 'kysely';

export const NON_TRANSACTIONAL_MIGRATION_NAME = /(^|_)concurrent(_|$)/i;

export interface FileMigrationProviderOptions {
    migrationFolder: string;
}

export interface CreateMigratorOptions extends FileMigrationProviderOptions {
    provider?: MigrationProvider;
    wrapNonTransactionalMigrations?: boolean;
    nonTransactionalNamePattern?: RegExp;
}

export class ConcurrentSafeMigrationProvider implements MigrationProvider {
    constructor(
        private readonly delegate: MigrationProvider,
        private readonly db: Kysely<unknown>,
        private readonly namePattern = NON_TRANSACTIONAL_MIGRATION_NAME,
    ) {}

    async getMigrations(): Promise<Record<string, Migration>> {
        const migrations = await this.delegate.getMigrations();
        const wrapped: Record<string, Migration> = {};

        for (const [name, migration] of Object.entries(migrations)) {
            if (!this.namePattern.test(name)) {
                wrapped[name] = migration;
                continue;
            }

            wrapped[name] = {
                up: async () => {
                    await migration.up(this.db);
                },
                down: migration.down
                    ? async () => {
                          await migration.down?.(this.db);
                      }
                    : undefined,
            };
        }

        return wrapped;
    }
}

export function createFileMigrationProvider(options: FileMigrationProviderOptions): FileMigrationProvider {
    return new FileMigrationProvider({
        fs,
        path,
        migrationFolder: options.migrationFolder,
    });
}

export function createMigrator(db: Kysely<unknown>, options: CreateMigratorOptions): Migrator {
    const provider = options.provider ?? createFileMigrationProvider(options);
    const migrationProvider =
        options.wrapNonTransactionalMigrations === false
            ? provider
            : new ConcurrentSafeMigrationProvider(provider, db, options.nonTransactionalNamePattern);

    return new Migrator({
        db,
        provider: migrationProvider,
    });
}
