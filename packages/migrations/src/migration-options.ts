import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type { MigrationProvider } from 'kysely';

const MAX_MIGRATION_FOLDER_LENGTH = 4096;

export class MigrationConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = MigrationConfigurationError.name;
    }
}

export interface FileMigrationProviderOptions {
    migrationFolder: string;
}

export interface CreateMigratorOptions {
    /** Required unless a custom migration provider is supplied. */
    migrationFolder?: string;
    provider?: MigrationProvider;
    /** Wrap named non-transactional migrations so they use the outer database connection. Defaults to true. */
    wrapNonTransactionalMigrations?: boolean;
    nonTransactionalNamePattern?: RegExp;
}

export interface MigrationModuleOptions extends CreateMigratorOptions {
    autoRun?: boolean;
    autoRunInProduction?: boolean;
    /** Make the dynamic module global. Defaults to false. */
    isGlobal?: boolean;
}

export type MigrationModuleFactoryOptions = Omit<MigrationModuleOptions, 'isGlobal'>;

export interface MigrationModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /** Make the dynamic module global. This must be known before the async factory runs. */
    isGlobal?: boolean;
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<MigrationModuleFactoryOptions>['useFactory'];
}

export interface NormalizedCreateMigratorOptions {
    readonly migrationFolder?: string;
    readonly provider?: MigrationProvider;
    readonly wrapNonTransactionalMigrations: boolean;
    readonly nonTransactionalNamePattern?: RegExp;
}

export interface NormalizedMigrationModuleOptions extends NormalizedCreateMigratorOptions {
    readonly autoRun: boolean | undefined;
    readonly autoRunInProduction: boolean;
    readonly isGlobal: boolean;
}

export function createMigrationModuleOptions(options: MigrationModuleOptions): NormalizedMigrationModuleOptions {
    const migratorOptions = normalizeCreateMigratorOptions(options);

    return Object.freeze({
        ...migratorOptions,
        autoRun: optionalBoolean(options.autoRun, 'autoRun'),
        autoRunInProduction: optionalBoolean(options.autoRunInProduction, 'autoRunInProduction') ?? false,
        isGlobal: optionalBoolean(options.isGlobal, 'isGlobal') ?? false,
    });
}

export function normalizeCreateMigratorOptions(options: CreateMigratorOptions): NormalizedCreateMigratorOptions {
    if (!options || typeof options !== 'object') {
        throw new MigrationConfigurationError('Migration options must be an object.');
    }

    const migrationFolder = normalizeMigrationFolder(options.migrationFolder);
    const provider = normalizeProvider(options.provider);

    if (!migrationFolder && !provider) {
        throw new MigrationConfigurationError('migrationFolder is required unless a custom provider is supplied.');
    }

    const nonTransactionalNamePattern = options.nonTransactionalNamePattern;
    if (nonTransactionalNamePattern !== undefined && !(nonTransactionalNamePattern instanceof RegExp)) {
        throw new MigrationConfigurationError('nonTransactionalNamePattern must be a RegExp.');
    }

    return Object.freeze({
        migrationFolder,
        provider,
        wrapNonTransactionalMigrations:
            optionalBoolean(options.wrapNonTransactionalMigrations, 'wrapNonTransactionalMigrations') ?? true,
        nonTransactionalNamePattern,
    });
}

export function validateMigrationModuleAsyncOptions(options: MigrationModuleAsyncOptions): void {
    if (!options || typeof options !== 'object') {
        throw new MigrationConfigurationError('Async migration module options must be an object.');
    }
    if (typeof options.useFactory !== 'function') {
        throw new MigrationConfigurationError('MigrationModule.registerAsync requires a useFactory function.');
    }
    optionalBoolean(options.isGlobal, 'isGlobal');
}

function normalizeMigrationFolder(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new MigrationConfigurationError('migrationFolder must be a non-empty string.');
    }
    if (value.length > MAX_MIGRATION_FOLDER_LENGTH) {
        throw new MigrationConfigurationError(
            `migrationFolder must contain at most ${MAX_MIGRATION_FOLDER_LENGTH} characters.`,
        );
    }
    if (value.includes('\0')) {
        throw new MigrationConfigurationError('migrationFolder must not contain null bytes.');
    }
    return value;
}

function normalizeProvider(value: MigrationProvider | undefined): MigrationProvider | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!value || typeof value !== 'object' || typeof value.getMigrations !== 'function') {
        throw new MigrationConfigurationError('provider must implement getMigrations().');
    }
    return value;
}

function optionalBoolean(value: boolean | undefined, name: string): boolean | undefined {
    if (value !== undefined && typeof value !== 'boolean') {
        throw new MigrationConfigurationError(`${name} must be a boolean.`);
    }
    return value;
}
