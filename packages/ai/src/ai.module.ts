import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import { AiConfigurationError } from './ai.errors';
import { normalizeAiModuleOptions } from './ai.options';
import { AiService } from './ai.service';
import { AI_MODULE_OPTIONS, type AiModuleAsyncOptions, type AiModuleOptions } from './ai.types';

@Module({})
export class AiModule {
    static register(options: AiModuleOptions): DynamicModule {
        const normalized = normalizeAiModuleOptions(options);
        return this.createDynamicModule(
            {
                provide: AI_MODULE_OPTIONS,
                useValue: normalized,
            },
            normalized.isGlobal,
        );
    }

    static registerAsync(options: AiModuleAsyncOptions): DynamicModule {
        if (typeof options !== 'object' || options === null || Array.isArray(options)) {
            throw new AiConfigurationError('AiModule async options are required');
        }
        if (typeof options.useFactory !== 'function') {
            throw new AiConfigurationError('AiModule registerAsync requires a useFactory function');
        }
        if (options.isGlobal !== undefined && typeof options.isGlobal !== 'boolean') {
            throw new AiConfigurationError('AiModule isGlobal must be a boolean');
        }

        const optionsFactory = options.useFactory;
        return {
            module: AiModule,
            global: options.isGlobal ?? false,
            imports: options.imports,
            providers: [
                {
                    provide: AI_MODULE_OPTIONS,
                    useFactory: async (...args: unknown[]) => normalizeAiModuleOptions(await optionsFactory(...args)),
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
