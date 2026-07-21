import { KyselyService } from '@a3s-lab/kysely';
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { type CreateMigratorOptions, createMigrator } from './migration-provider';

export const MIGRATION_MODULE_OPTIONS = Symbol('MIGRATION_MODULE_OPTIONS');

export interface MigrationModuleOptions extends CreateMigratorOptions {
    autoRun?: boolean;
    autoRunInProduction?: boolean;
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
    options: MigrationModuleOptions,
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
        return shouldAutoRunMigrations(this.options);
    }
}
