import { type DynamicModule, Module } from '@nestjs/common';
import { ASYNC_OPTIONS_TYPE, ConfigurableModuleClass, OPTIONS_TYPE } from './sandbox.module-definition';
import { SandboxService } from './sandbox.service';

@Module({})
export class SandboxModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.register(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers ?? []), SandboxService],
            exports: [SandboxService],
        };
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.registerAsync(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers ?? []), SandboxService],
            exports: [SandboxService],
        };
    }
}
