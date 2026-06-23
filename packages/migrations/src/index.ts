import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { DynamicModule, Inject, Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { FileMigrationProvider, Migrator, type Kysely, type Migration, type MigrationProvider } from 'kysely';

export const NON_TRANSACTIONAL_MIGRATION_NAME = /(^|_)concurrent(_|$)/i;
export const MIGRATION_MODULE_OPTIONS = Symbol('MIGRATION_MODULE_OPTIONS');

export interface FileMigrationProviderOptions {
    migrationFolder: string;
}

export interface CreateMigratorOptions extends FileMigrationProviderOptions {
    provider?: MigrationProvider;
    wrapNonTransactionalMigrations?: boolean;
    nonTransactionalNamePattern?: RegExp;
}

export interface MigrationModuleOptions extends CreateMigratorOptions {
    autoRun?: boolean;
    autoRunInProduction?: boolean;
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

@Injectable()
export class MigrationRunner implements OnApplicationBootstrap {
    private readonly logger = new Logger(MigrationRunner.name);

    constructor(
        private readonly db: KyselyService<unknown>,
        @Inject(MIGRATION_MODULE_OPTIONS)
        private readonly options: MigrationModuleOptions,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        if (!this.shouldAutoRun()) {
            return;
        }

        this.logger.log(`Running database migrations from ${this.options.migrationFolder}`);
        const migrator = createMigrator(this.db, this.options);
        const { error, results } = await migrator.migrateToLatest();

        if (error) {
            this.logger.error('Migration failed', error instanceof Error ? error.stack : String(error));
            throw error;
        }

        if (!results || results.length === 0) {
            this.logger.log('No pending migrations');
            return;
        }

        for (const result of results) {
            if (result.status === 'Success') {
                this.logger.log(`Migration "${result.migrationName}" executed successfully`);
            } else if (result.status === 'Error') {
                this.logger.error(`Migration "${result.migrationName}" failed`);
            }
        }
    }

    private shouldAutoRun(): boolean {
        if (this.options.autoRun !== undefined) {
            return this.options.autoRun;
        }
        if (process.env.AUTO_MIGRATE === 'true') {
            return true;
        }
        return this.options.autoRunInProduction !== false && process.env.NODE_ENV === 'production';
    }
}

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
