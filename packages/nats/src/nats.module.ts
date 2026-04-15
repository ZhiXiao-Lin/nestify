import { DynamicModule, Module } from '@nestjs/common';
import {
    ASYNC_OPTIONS_TYPE,
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from './nats.module-definition';
import { NatsServiceImpl } from './nats.service';

@Module({})
export class NatsModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), NatsServiceImpl],
            exports: [NatsServiceImpl],
        };
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.registerAsync(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), NatsServiceImpl],
            exports: [NatsServiceImpl],
        };
    }
}
