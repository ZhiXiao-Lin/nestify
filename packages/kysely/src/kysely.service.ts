import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Kysely } from "kysely";
import type { KyselyModuleOptions } from "./kysely-module-options.interface";
import { MODULE_OPTIONS_TOKEN } from "./kysely.module-definition";

@Injectable()
export class KyselyService<T> extends Kysely<T> implements OnModuleDestroy {
    /**
     * Creates a new KyselyService instance
     * @param options - Kysely configuration options injected by NestJS
     * @throws {Error} If options are not provided
     */
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        options: KyselyModuleOptions,
    ) {
        if (!options) {
            throw new Error(
                "KyselyModuleOptions is not defined. Ensure KyselyModule is properly configured.",
            );
        }
        super(options.config);
    }

    /**
     * Cleanup method called when the module is destroyed.
     * Properly closes database connections to prevent leaks.
     */
    async onModuleDestroy(): Promise<void> {
        await this.destroy();
    }
}
