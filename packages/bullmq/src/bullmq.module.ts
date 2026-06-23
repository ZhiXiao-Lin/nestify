// ============================================================================
// BullMQ Module - Distributed task queue
// ============================================================================

import {
    Module,
    Global,
    type DynamicModule,
    type FactoryProvider,
    type ModuleMetadata,
    type Provider,
} from '@nestjs/common';
import type { BullMQModuleOptions } from './bullmq.types';
import { BULLMQ_OPTIONS_TOKEN } from './bullmq.module-definition';
import { BullMQService } from './bullmq.service';

@Global()
@Module({})
export class BullMQModule {
    /**
     * Register BullMQ module with static options
     */
    static register(options: BullMQModuleOptions): DynamicModule {
        return {
            module: BullMQModule,
            providers: [
                {
                    provide: BULLMQ_OPTIONS_TOKEN,
                    useValue: options,
                },
                BullMQService,
            ],
            exports: [BullMQService],
        };
    }

    /**
     * Register BullMQ module asynchronously (for ConfigService-based config)
     */
    static registerAsync(options: {
        imports?: ModuleMetadata['imports'];
        useFactory?: (...args: unknown[]) => Promise<BullMQModuleOptions> | BullMQModuleOptions;
        inject?: FactoryProvider['inject'];
    }): DynamicModule {
        const asyncProviders: Provider[] = [];

        if (options.useFactory) {
            asyncProviders.push({
                provide: BULLMQ_OPTIONS_TOKEN,
                useFactory: options.useFactory,
                inject: options.inject ?? [],
            });
        }

        return {
            module: BullMQModule,
            imports: options.imports,
            providers: [...asyncProviders, BullMQService],
            exports: [BullMQService],
        };
    }
}
