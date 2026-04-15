import { DynamicModule, Module } from '@nestjs/common';
import {
    ASYNC_OPTIONS_TYPE,
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from './rustfs.module-definition';
import { RustFSServiceImpl } from './rustfs.service';

@Module({})
export class RustFSModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), RustFSServiceImpl],
            exports: [RustFSServiceImpl],
        };
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.registerAsync(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), RustFSServiceImpl],
            exports: [RustFSServiceImpl],
        };
    }
}
