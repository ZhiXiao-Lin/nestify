import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kysely, type KyselyConfig } from 'kysely';
import { MODULE_OPTIONS_TOKEN } from './kysely.module-definition';
import {
    KyselyConfigurationError,
    type KyselyModuleOptions,
    normalizeKyselyModuleOptions,
} from './kysely-module-options.interface';

@Injectable()
export class KyselyService<T> extends Kysely<T> implements OnModuleDestroy {
    private destroyInFlight?: Promise<void>;

    /**
     * Creates a new KyselyService instance
     * @param options - Kysely configuration options injected by NestJS
     * @throws {Error} If options are not provided
     */
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        options: KyselyModuleOptions,
    ) {
        const normalized = normalizeKyselyModuleOptions(options);
        if (normalized.instance) {
            throw new KyselyConfigurationError(
                'Existing instances must be registered through KyselyModule instead of constructing KyselyService.',
            );
        }
        super(normalized.config as KyselyConfig);
    }

    /**
     * Cleanup method called when the module is destroyed.
     * Properly closes database connections to prevent leaks.
     */
    async onModuleDestroy(): Promise<void> {
        await this.destroy();
    }

    override destroy(): Promise<void> {
        if (!this.destroyInFlight) {
            this.destroyInFlight = super.destroy();
        }
        return this.destroyInFlight;
    }
}
