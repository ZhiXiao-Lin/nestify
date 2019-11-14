import { DynamicModule, Module } from '@nestjs/common';
import { EVENT_BUS_OPTIONS } from './event-bus.constants';
import { EventBusModuleOptions } from './event-bus.interfaces';
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
            providers: providers,
            exports: providers
        };
    }
}
