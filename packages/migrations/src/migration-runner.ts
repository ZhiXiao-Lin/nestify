import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { type CreateMigratorOptions, createMigrator } from './migration-provider';

export const MIGRATION_MODULE_OPTIONS = Symbol('MIGRATION_MODULE_OPTIONS');

export interface MigrationModuleOptions extends CreateMigratorOptions {
    autoRun?: boolean;
    autoRunInProduction?: boolean;
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
