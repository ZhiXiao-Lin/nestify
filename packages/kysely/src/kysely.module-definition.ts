import { ConfigurableModuleBuilder } from "@nestjs/common";
import { KyselyModuleOptions } from "./kysely-module-options.interface";

/**
 * Configurable module builder for KyselyModule
 * Provides both synchronous and asynchronous registration methods
 * with optional global module configuration
 */
export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<KyselyModuleOptions>()
    .setExtras(
        {
            isGlobal: true,
        },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal,
        }),
    )
    .build();
