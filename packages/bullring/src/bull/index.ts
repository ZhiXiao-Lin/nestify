export * from './bull.constants';
export * from './bull.interfaces';
export * from './bull.service';
export * from './dtos';

import { DynamicModule, Module } from '@nestjs/common';
import { BULL_OPTIONS } from './bull.constants';
import { BullModuleOptions } from './bull.interfaces';
import { BullService } from './bull.service';
import { createQueueController } from './controllers';

export function createBullModule(options: BullModuleOptions): DynamicModule {
    const bullController = createQueueController(options.listenOptions.basePath);

    @Module({
        controllers: [bullController],
        providers: [BullService],
        exports: [BullService]
    })
    class BullModule {
        public static register(options: BullModuleOptions): DynamicModule {
            const providers = [
                {
                    provide: BULL_OPTIONS,
                    useValue: options || {}
                }
            ];

            return {
                module: BullModule,
                providers,
                exports: providers
            };
        }
    }

    return BullModule.register(options);
}
