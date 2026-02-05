import type { ModuleMetadata, Type } from "@nestjs/common";
import type { Kysely, KyselyConfig } from "kysely";

export interface KyselyModuleOptions<DB = unknown> {
    config: KyselyConfig;
    /**
     * Optional existing Kysely instance to use instead of creating a new one
     */
    instance?: Kysely<DB>;
}

export interface KyselyModuleOptionsFactory<DB = unknown> {
    createKyselyModuleOptions():
        | Promise<KyselyModuleOptions<DB>>
        | KyselyModuleOptions<DB>;
}

export interface KyselyModuleAsyncOptions<DB = unknown>
    extends Pick<ModuleMetadata, "imports"> {
    useExisting?: Type<KyselyModuleOptionsFactory<DB>>;
    useClass?: Type<KyselyModuleOptionsFactory<DB>>;
    useFactory?: (
        ...args: unknown[]
    ) => Promise<KyselyModuleOptions<DB>> | KyselyModuleOptions<DB>;
    inject?: unknown[];
}
