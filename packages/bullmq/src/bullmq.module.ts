// ============================================================================
// BullMQ Module - Distributed task queue
// ============================================================================

import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { BullMQModuleOptions, BullMQOptionsFactory } from './bullmq.types';
import { BullMQService } from './bullmq.service';

@Global()
@Module({
    providers: [BullMQService],
    exports: [BullMQService],
})
export class BullMQModule {
    /**
     * Register BullMQ module with static options
     */
    static register(options: BullMQModuleOptions): DynamicModule {
        return {
            module: BullMQModule,
            providers: [
                {
                    provide: BullMQModuleOptions,
                    useValue: options,
                },
            ],
            exports: [BullMQService],
        };
    }

    /**
     * Register BullMQ module asynchronously (for ConfigService-based config)
     */
    static registerAsync(options: {
        useFactory?: (factory: BullMQOptionsFactory) => Promise<BullMQModuleOptions> | BullMQModuleOptions;
        inject?: any[];
    }): DynamicModule {
        const asyncProviders: Provider[] = [];

        if (options.useFactory) {
            asyncProviders.push({
                provide: BullMQModuleOptions,
                useFactory: options.useFactory,
                inject: options.inject ?? [],
            });
        }

        return {
            module: BullMQModule,
            imports: [],
            providers: asyncProviders,
            exports: [BullMQService],
        };
    }
}
