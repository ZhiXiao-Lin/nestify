import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { FileMigrationProvider, type Kysely, type Migration, type MigrationProvider, Migrator } from 'kysely';
import {
    type CreateMigratorOptions,
    type FileMigrationProviderOptions,
    MigrationConfigurationError,
    normalizeCreateMigratorOptions,
} from './migration-options';

export const NON_TRANSACTIONAL_MIGRATION_NAME = /(^|_)concurrent(_|$)/i;

export class ConcurrentSafeMigrationProvider implements MigrationProvider {
    private readonly namePattern: RegExp;

    constructor(
        private readonly delegate: MigrationProvider,
        private readonly db: Kysely<unknown>,
        namePattern = NON_TRANSACTIONAL_MIGRATION_NAME,
    ) {
        if (!delegate || typeof delegate.getMigrations !== 'function') {
            throw new MigrationConfigurationError('delegate must implement getMigrations().');
        }
        if (!(namePattern instanceof RegExp)) {
            throw new MigrationConfigurationError('namePattern must be a RegExp.');
        }
        this.namePattern = new RegExp(namePattern.source, namePattern.flags);
    }

    async getMigrations(): Promise<Record<string, Migration>> {
        const migrations = await this.delegate.getMigrations();
        const wrapped: Array<[string, Migration]> = [];

        for (const [name, migration] of Object.entries(migrations)) {
            if (!this.matchesNonTransactionalName(name)) {
                wrapped.push([name, migration]);
                continue;
            }

            wrapped.push([
                name,
                {
                    up: async () => {
                        await migration.up(this.db);
                    },
                    down: migration.down
                        ? async () => {
                              await migration.down?.(this.db);
                          }
                        : undefined,
                },
            ]);
        }

        return Object.fromEntries(wrapped);
    }

    private matchesNonTransactionalName(name: string): boolean {
        this.namePattern.lastIndex = 0;
        const matches = this.namePattern.test(name);
        this.namePattern.lastIndex = 0;
        return matches;
    }
}

export function createFileMigrationProvider(options: FileMigrationProviderOptions): FileMigrationProvider {
    const { migrationFolder } = normalizeCreateMigratorOptions(options);

    return new FileMigrationProvider({
        fs,
        path,
        migrationFolder: migrationFolder as string,
    });
}

export function createMigrator(db: Kysely<unknown>, options: CreateMigratorOptions): Migrator {
    const normalized = normalizeCreateMigratorOptions(options);
    const provider =
        normalized.provider ?? createFileMigrationProvider({ migrationFolder: normalized.migrationFolder as string });
    const migrationProvider =
        normalized.wrapNonTransactionalMigrations === false
            ? provider
            : new ConcurrentSafeMigrationProvider(provider, db, normalized.nonTransactionalNamePattern);

    return new Migrator({
        db,
        provider: migrationProvider,
    });
}
