import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import {
    ASYNC_OPTIONS_TYPE,
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from './logger.module-definition';
import { LoggerServiceImpl } from './logger.service';
import type { LoggerModuleOptions } from './logger.types';
import { LoggingInterceptor } from './logging.interceptor';

@Module({})
export class LoggerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        return this.withProviders(super.register(options));
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
        return this.withProviders(super.registerAsync(options));
    }

    private static withProviders(dynamicModule: DynamicModule): DynamicModule {
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers ?? []), ...createLoggerProviders()],
            exports: [LoggerServiceImpl, LoggingInterceptor],
        };
    }
}

function createLoggerProviders(): Provider[] {
    return [
        {
            provide: LoggerServiceImpl,
            useFactory: (options: LoggerModuleOptions) => new LoggerServiceImpl(options),
            inject: [MODULE_OPTIONS_TOKEN],
        },
        {
            provide: LoggingInterceptor,
            useFactory: (logger: LoggerServiceImpl, options: LoggerModuleOptions) =>
                new LoggingInterceptor(logger, options.interceptor),
            inject: [LoggerServiceImpl, MODULE_OPTIONS_TOKEN],
        },
    ];
}
