import { ConfigurableModuleBuilder } from '@nestjs/common';
import { RedissonModuleOptions } from './redisson-module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
    new ConfigurableModuleBuilder<RedissonModuleOptions>()
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
