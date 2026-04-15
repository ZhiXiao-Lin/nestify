import { ConfigurableModuleBuilder } from '@nestjs/common';
import { LoggerModuleOptions } from './logger.types';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<LoggerModuleOptions>()
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
