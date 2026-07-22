import { KyselyService } from '@a3s-lab/kysely';
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { MigrationResultSet } from 'kysely';
import type { MigrationModuleOptions, NormalizedMigrationModuleOptions } from './migration-options';
import { createMigrationModuleOptions } from './migration-options';
import { createMigrator } from './migration-provider';

export const MIGRATION_MODULE_OPTIONS = Symbol('MIGRATION_MODULE_OPTIONS');

export class MigrationExecutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = MigrationExecutionError.name;
    }
}

export interface MigrationRuntimeEnvironment {
    AUTO_MIGRATE?: string;
    NODE_ENV?: string;
}

/**
 * Resolves migration startup policy with explicit, fail-closed precedence.
 *
 * `autoRun` is the strongest signal, followed by `AUTO_MIGRATE`. Production
 * startup remains disabled unless the consumer explicitly opts in.
 */
export function shouldAutoRunMigrations(
    options: Pick<MigrationModuleOptions, 'autoRun' | 'autoRunInProduction'>,
    environment: MigrationRuntimeEnvironment = {
        AUTO_MIGRATE: process.env.AUTO_MIGRATE,
        NODE_ENV: process.env.NODE_ENV,
    },
): boolean {
    if (options.autoRun !== undefined) {
        return options.autoRun;
    }
    if (environment.AUTO_MIGRATE !== undefined) {
        return environment.AUTO_MIGRATE === 'true';
    }
    return environment.NODE_ENV === 'production' && options.autoRunInProduction === true;
}

@Injectable()
export class MigrationRunner implements OnApplicationBootstrap {
    private readonly logger = new Logger(MigrationRunner.name);
    private migrationInFlight?: Promise<MigrationResultSet>;
    private readonly normalizedOptions: NormalizedMigrationModuleOptions;

    constructor(
        private readonly db: KyselyService<unknown>,
        @Inject(MIGRATION_MODULE_OPTIONS)
        options: MigrationModuleOptions,
    ) {
        this.normalizedOptions = createMigrationModuleOptions(options);
    }

    async onApplicationBootstrap(): Promise<void> {
        if (!this.shouldAutoRun()) {
            return;
        }

        await this.runMigrations();
    }

    runMigrations(): Promise<MigrationResultSet> {
        if (this.migrationInFlight) {
            return this.migrationInFlight;
        }

        const migration = this.executeMigrations();
        this.migrationInFlight = migration;
        const clearInFlight = () => {
            if (this.migrationInFlight === migration) {
                this.migrationInFlight = undefined;
            }
        };
        void migration.then(clearInFlight, clearInFlight);
        return migration;
    }

    private async executeMigrations(): Promise<MigrationResultSet> {
        const source = this.normalizedOptions.migrationFolder ?? 'configured provider';
        this.logger.log(`Running database migrations from ${JSON.stringify(source)}`);
        const migrator = createMigrator(this.db, this.normalizedOptions);
        const resultSet = await migrator.migrateToLatest();
        const { error, results } = resultSet;

        if (error !== undefined) {
            const failedMigration = results?.find(result => result.status === 'Error');
            const message = failedMigration
                ? `Migration ${JSON.stringify(failedMigration.migrationName)} failed`
                : 'Migration failed before execution completed';
            this.logger.error(message, error instanceof Error ? error.stack : String(error));
            throw error;
        }

        if (!results || results.length === 0) {
            this.logger.log('No pending migrations');
            return resultSet;
        }

        let failedMigration: string | undefined;
        let skippedMigration: string | undefined;
        for (const result of results) {
            if (result.status === 'Success') {
                this.logger.log(`Migration ${JSON.stringify(result.migrationName)} executed successfully`);
            } else if (result.status === 'Error') {
                failedMigration = result.migrationName;
                this.logger.error(`Migration ${JSON.stringify(result.migrationName)} failed without an error value`);
            } else {
                skippedMigration = result.migrationName;
                this.logger.warn(`Migration ${JSON.stringify(result.migrationName)} was not executed`);
            }
        }

        if (failedMigration) {
            throw new MigrationExecutionError(
                `Migration ${JSON.stringify(failedMigration)} failed without an error value from Kysely.`,
            );
        }

        if (skippedMigration) {
            throw new MigrationExecutionError(
                `Migration ${JSON.stringify(skippedMigration)} was not executed without an error value from Kysely.`,
            );
        }

        return resultSet;
    }

    private shouldAutoRun(): boolean {
        return shouldAutoRunMigrations(this.normalizedOptions);
    }
}
