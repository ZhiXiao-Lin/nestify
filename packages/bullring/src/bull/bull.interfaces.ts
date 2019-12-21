import { ModuleMetadata } from '@nestjs/common/interfaces';
import { QueueOptions } from 'bull';

interface MiddlewareListenOptions {
    port?: number;
    host?: string;
    basePath?: string;
}

export interface BullQueueOptions {
    name: string;
    options: QueueOptions;
}

export interface BullModuleOptions {
    queues: Array<BullQueueOptions>;
    listenOptions: MiddlewareListenOptions;
}

export interface BullModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<BullModuleOptions> | BullModuleOptions;
    inject?: any[];
}
