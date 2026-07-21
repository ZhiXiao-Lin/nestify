import type { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import type { Kysely, KyselyConfig } from 'kysely';

export class KyselyConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = KyselyConfigurationError.name;
    }
}

export interface KyselyModuleOptions<DB = unknown> {
    /** Required unless an existing Kysely instance is supplied. */
    config?: KyselyConfig;
    /**
     * Existing Kysely instance to expose. Its lifecycle remains owned by the caller.
     */
    instance?: Kysely<DB>;
}

export interface ConfiguredKyselyModuleOptions<DB = unknown> extends KyselyModuleOptions<DB> {
    config: KyselyConfig;
}

export interface NormalizedKyselyModuleOptions<DB = unknown> {
    readonly config?: KyselyConfig;
    readonly instance?: Kysely<DB>;
}

export interface KyselyModuleOptionsFactory<DB = unknown> {
    createKyselyModuleOptions(): Promise<KyselyModuleOptions<DB>> | KyselyModuleOptions<DB>;
}

export interface KyselyModuleAsyncOptions<DB = unknown> extends Pick<ModuleMetadata, 'imports'> {
    isGlobal?: boolean;
    useExisting?: Type<KyselyModuleOptionsFactory<DB>>;
    useClass?: Type<KyselyModuleOptionsFactory<DB>>;
    useFactory?: FactoryProvider<KyselyModuleOptions<DB>>['useFactory'];
    inject?: FactoryProvider['inject'];
}

export function normalizeKyselyModuleOptions<DB>(options: KyselyModuleOptions<DB>): NormalizedKyselyModuleOptions<DB> {
    if (!options || typeof options !== 'object') {
        throw new KyselyConfigurationError('Kysely module options must be an object.');
    }

    if (options.instance !== undefined) {
        if (!isKyselyInstance(options.instance)) {
            throw new KyselyConfigurationError('instance must be a Kysely-compatible object.');
        }
        return Object.freeze({
            config: options.config,
            instance: options.instance,
        });
    }

    validateKyselyConfig(options.config);
    return Object.freeze({ config: options.config });
}

function validateKyselyConfig(config: KyselyConfig | undefined): asserts config is KyselyConfig {
    if (!config || typeof config !== 'object') {
        throw new KyselyConfigurationError('config is required unless an existing instance is supplied.');
    }

    const dialect = config.dialect;
    if (!dialect || typeof dialect !== 'object') {
        throw new KyselyConfigurationError('config.dialect must be a Kysely dialect.');
    }

    for (const method of ['createDriver', 'createQueryCompiler', 'createAdapter', 'createIntrospector'] as const) {
        if (typeof dialect[method] !== 'function') {
            throw new KyselyConfigurationError(`config.dialect.${method} must be a function.`);
        }
    }
}

function isKyselyInstance(value: unknown): value is Kysely<unknown> {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as Kysely<unknown>).selectFrom === 'function' &&
        typeof (value as Kysely<unknown>).destroy === 'function'
    );
}
