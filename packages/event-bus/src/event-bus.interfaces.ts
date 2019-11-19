import { ModuleMetadata } from '@nestjs/common/interfaces';
import { EventEmitter } from 'events';

export interface SubscriberDecoratorOptions {}

export interface ListenerDecoratorOptions {
    event: string | symbol;
}

export type Callback = (...args: any[]) => Promise<any>;

export interface EventBusModuleOptions {
    event?: EventEmitter;
}

export interface EventBusModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<EventBusModuleOptions> | EventBusModuleOptions;
    inject?: any[];
}
