import { ModuleMetadata } from '@nestjs/common/interfaces';
import { EventEmitter } from 'events';

export interface NotificationModuleOptions {
    event: EventEmitter;
}

export interface NotificationModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<NotificationModuleOptions> | NotificationModuleOptions;
    inject?: any[];
}
