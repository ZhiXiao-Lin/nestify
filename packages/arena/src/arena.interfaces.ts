import { ModuleMetadata } from '@nestjs/common/interfaces';
import { ClientOpts } from "redis";

interface MiddlewareListenOptions {
    port?: number;
    host?: string;
    basePath?: string;
    disableListen?: boolean;
    useCdn?: boolean;
}

interface QueueOptions {
    name: string;
    hostId?: string;
    type?: "bull" | "bee";
    prefix?: "bull" | "bq" | string;
}

type ConnectionOptions =
    | PortHostConnectionOptions
    | RedisUrlConnectionOptions
    | RedisClientConnectionOptions;

interface PortHostConnectionOptions {
    host: string;
    port?: number;
    password?: string;
    db?: string;
}

interface RedisUrlConnectionOptions {
    url: string;
}

interface RedisClientConnectionOptions {
    redis: ClientOpts;
}

export interface ArenaModuleOptions {
    queues: Array<QueueOptions & ConnectionOptions>;
    listenOptions: MiddlewareListenOptions;
}

export interface ArenaModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<ArenaModuleOptions> | ArenaModuleOptions;
    inject?: any[];
}
