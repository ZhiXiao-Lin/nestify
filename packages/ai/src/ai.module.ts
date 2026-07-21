import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { AiService } from './ai.service';
import { AI_MODULE_OPTIONS, type AiModuleAsyncOptions, type AiModuleOptions } from './ai.types';

@Module({})
export class AiModule {
    static register(options: AiModuleOptions): DynamicModule {
        return this.createDynamicModule(
            {
                provide: AI_MODULE_OPTIONS,
                useValue: options,
            },
            options.isGlobal,
        );
    }

    static registerAsync(options: AiModuleAsyncOptions): DynamicModule {
        return {
            module: AiModule,
            global: options.isGlobal ?? false,
            imports: options.imports,
            providers: [
                {
                    provide: AI_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject ?? [],
                },
                AiService,
            ],
            exports: [AiService],
        };
    }

    private static createDynamicModule(optionsProvider: Provider, isGlobal?: boolean): DynamicModule {
        return {
            module: AiModule,
            global: isGlobal ?? false,
            providers: [optionsProvider, AiService],
            exports: [AiService],
        };
    }
}
