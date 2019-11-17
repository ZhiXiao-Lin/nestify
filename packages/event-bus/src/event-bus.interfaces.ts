import { ModuleMetadata } from '@nestjs/common/interfaces';

export interface SubscriberDecoratorOptions {}

export interface ListenerDecoratorOptions {
    event: string | symbol;
}

export type Callback = (...args: any[]) => Promise<any>;

export interface EventBusModuleOptions {}

export interface EventBusModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<EventBusModuleOptions> | EventBusModuleOptions;
    inject?: any[];
}
