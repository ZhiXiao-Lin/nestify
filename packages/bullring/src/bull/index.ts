export * from './bull.constants';
import { DynamicModule, Module } from '@nestjs/common';
import { BULL_OPTIONS } from './bull.constants';
import { createBullController } from './bull.controllers';
import { BullModuleOptions } from './bull.interfaces';
import { BullService } from './bull.service';

export function createBullModule(options: BullModuleOptions): DynamicModule {
    const bullController = createBullController(options.listenOptions.basePath);

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
