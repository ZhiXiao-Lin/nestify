import { DynamicModule } from '@nestjs/common';
import { ConfigOptions } from './config.service';
export declare class ConfigModule {
    static initEnvironment(env?: string): void;
    static resolveSrcPath(startPath: string): typeof ConfigModule;
    static resolveRootPath(path: string): typeof ConfigModule;
    static register(glob: string, options?: ConfigOptions): DynamicModule;
}
