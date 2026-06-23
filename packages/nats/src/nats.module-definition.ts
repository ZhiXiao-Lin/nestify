import { ConfigurableModuleBuilder } from '@nestjs/common';
import { NatsPackageOptions } from './nats.types';

/**
 * Configurable module builder for NatsModule
 * Provides both synchronous and asynchronous registration methods
 * with optional global module configuration
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<NatsPackageOptions>()
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
