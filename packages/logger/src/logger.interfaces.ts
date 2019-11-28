import { ModuleMetadata } from '@nestjs/common/interfaces';
import { LoggerOptions } from 'winston';

export type LoggerModuleOptions = LoggerOptions;

export interface LoggerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
    inject?: any[];
}
