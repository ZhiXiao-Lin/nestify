import { DynamicModule, Module } from '@nestjs/common';
import { EVENT_BUS_OPTIONS } from './event-bus.constants';
import { EventBusModuleOptions, EventBusModuleAsyncOptions } from './event-bus.interfaces';
import { EventBusService } from './event-bus.service';

@Module({
    providers: [EventBusService],
    exports: [EventBusService]
})
export class EventBusModule {
    public static register(options: EventBusModuleOptions = {}): DynamicModule {
        const providers = [
            {
                provide: EVENT_BUS_OPTIONS,
                useValue: options
            }
        ];

        return {
            module: EventBusModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: EventBusModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: EVENT_BUS_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: EventBusModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}
