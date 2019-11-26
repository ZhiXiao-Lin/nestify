import { DynamicModule, Module } from '@nestjs/common';
import { createLogger, LoggerOptions } from 'winston';
import { LOGGER_MODULE_OPTIONS, LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerModuleAsyncOptions, LoggerModuleOptions } from './logger.interfaces';
import { LoggerProvider } from './logger.providers';
import { LoggerService } from './logger.service';

@Module({
    providers: [LoggerService, LoggerProvider],
    exports: [LoggerService, LoggerProvider]
})
export class LoggerModule {
    public static register(options: LoggerModuleOptions): DynamicModule {
        const providers = [
            {
                provide: LOGGER_MODULE_PROVIDER,
                useValue: createLogger(options)
            }
        ];

        return {
            module: LoggerModule,
            providers: providers,
            exports: providers
        };
    }

    public static registerAsync(options: LoggerModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: LOGGER_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            },
            {
                provide: LOGGER_MODULE_PROVIDER,
                useFactory: (loggerOpts: LoggerOptions) => createLogger(loggerOpts),
                inject: [LOGGER_MODULE_OPTIONS]
            }
        ];

        return {
            module: LoggerModule,
            imports: options.imports,
            providers: providers,
            exports: providers
        };
    }
}
