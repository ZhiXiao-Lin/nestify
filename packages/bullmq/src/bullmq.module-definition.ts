// ============================================================================
// BullMQ Module Definition - Configurable module pattern
// ============================================================================

import { ConfigurableModuleBuilder } from '@nestjs/common';
import { BullMQModuleOptions, BullMQOptionsFactory } from './bullmq.types';

export const MODULE_OPTIONS_TOKEN = 'BULLMQ_MODULE_OPTIONS';

export const {
    ConfigurableModuleClass: ConfigurableBullMQModule,
    MODULE_OPTIONS_TOKEN: BULLMQ_OPTIONS_TOKEN,
    CONFIG_GLOBAL_MODULE_NAME: BULLMQ_GLOBAL_MODULE_NAME,
} = new ConfigurableModuleBuilder<BullMQModuleOptions>({
    moduleName: 'BullMQ',
    global: true,
})
    .setExtras(
        { isGlobal: true },
        (definition, extras) => ({
            ...definition,
            global: extras.isGlobal ?? definition.global ?? false,
        }),
    )
    .build();
