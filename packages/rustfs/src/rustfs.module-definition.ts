import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { RustFSPackageOptions } from './rustfs.types';

/**
 * Configurable module builder for RustFSModule
 * Provides both synchronous and asynchronous registration methods
 * with optional global module configuration
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<RustFSPackageOptions>()
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
