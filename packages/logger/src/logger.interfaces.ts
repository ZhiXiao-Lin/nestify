import { ModuleMetadata } from '@nestjs/common/interfaces';
import { LoggerOptions } from 'winston';

export interface ILoggerService {
    error(...messages: any[]): any;
    warn(...messages: any[]): any;
    info(...messages: any[]): any;
    verbose(...messages: any[]): any;
    debug(...messages: any[]): any;
    silly(...messages: any[]): any;
}

export type LoggerModuleOptions = LoggerOptions;

export interface LoggerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
    inject?: any[];
}
