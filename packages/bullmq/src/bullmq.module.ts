// ============================================================================
// BullMQ Module - Distributed task queue
// ============================================================================

import { type DynamicModule, Global, Module, type Provider } from '@nestjs/common';
import { BULLMQ_OPTIONS_TOKEN } from './bullmq.module-definition';
import { BullMQService } from './bullmq.service';
import type { BullMQAsyncOptions, BullMQModuleOptions } from './bullmq.types';

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
    static registerAsync(options: BullMQAsyncOptions): DynamicModule {
        const asyncProviders: Provider[] = [
            {
                provide: BULLMQ_OPTIONS_TOKEN,
                useFactory: options.useFactory,
                inject: options.inject ?? [],
            },
        ];

        return {
            module: BullMQModule,
            imports: options.imports,
            providers: [...asyncProviders, BullMQService],
            exports: [BullMQService],
        };
    }
}
