import { Module, Global } from '@nestjs/common';
import {
    ASYNC_OPTIONS_TYPE,
    ConfigurableModuleClass,
    OPTIONS_TYPE,
} from './logger.module-definition';
import { LoggerServiceImpl, Logger } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({})
export class LoggerModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE) {
        const dynamicModule = super.register(options);
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                LoggerServiceImpl,
                {
                    provide: Logger,
                    useFactory: (opts: any) => new LoggerServiceImpl(opts),
                    inject: [OPTIONS_TYPE],
                },
                LoggingInterceptor,
            ],
            exports: [LoggerServiceImpl, Logger, LoggingInterceptor],
        };
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE) {
        const dynamicModule = super.registerAsync(options);
        return {
            ...dynamicModule,
            providers: [
                ...(dynamicModule.providers || []),
                LoggerServiceImpl,
                {
                    provide: Logger,
                    useFactory: (opts: any) => new LoggerServiceImpl(opts),
                    inject: [OPTIONS_TYPE],
                },
                LoggingInterceptor,
            ],
            exports: [LoggerServiceImpl, Logger, LoggingInterceptor],
        };
    }
}
