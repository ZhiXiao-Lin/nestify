import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import pino, { BaseLogger } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { LoggerModuleOptions, LogLevel, LogContext } from './logger.types';

// Async local storage for request context
const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerServiceImpl implements NestLoggerService {
    private logger: BaseLogger;
    private name: string;
    private baseContext: Partial<LogContext>;

    constructor(options: LoggerModuleOptions = {}) {
        this.name = options.name || 'app';
        this.baseContext = options.base || {};

        const pinoOptions: pino.LoggerOptions = {
            level: options.level || 'info',
            name: this.name,
            base: {
                service: this.name,
                ...this.baseContext,
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label: string) => ({ level: label }),
            },
            ...(options.redact ? { redact: options.redact } : {}),
        };

        if (options.prettyPrint || process.env.NODE_ENV === 'development') {
            pinoOptions.transport = {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                },
            };
        }

        this.logger = pino(pinoOptions);
    }

    // =========================================================================
    // Basic Logging Methods
    // =========================================================================

    log(message: string, context?: string): void;
    log(level: LogLevel, message: string, context?: string): void;
    log(levelOrMessage: string | LogLevel, messageOrContext?: string | LogContext, context?: string): void {
        if (typeof levelOrMessage === 'string' && this.isLogLevel(levelOrMessage)) {
            // overload: (level, message, context?)
            const level = levelOrMessage;
            const message = messageOrContext as string;
            this.logAtLevel(level, message, this.normalizeContext(context));
        } else if (typeof levelOrMessage === 'string') {
            // overload: (message, context?)
            const message = levelOrMessage;
            this.logAtLevel('info', message, this.normalizeContext(messageOrContext));
        } else {
            this.logAtLevel('info', levelOrMessage);
        }
    }

    fatal(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('fatal', message, context);
    }

    error(message: string, context?: Partial<LogContext>): void;
    error(error: Error, context?: Partial<LogContext>): void;
    error(errorOrMessage: Error | string, context?: Partial<LogContext>): void {
        if (errorOrMessage instanceof Error) {
            this.logError(errorOrMessage, context);
        } else {
            this.logAtLevel('error', errorOrMessage, context);
        }
    }

    warn(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('warn', message, context);
    }

    info(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('info', message, context);
    }

    debug(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('debug', message, context);
    }

    trace(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('trace', message, context);
    }

    verbose(message: string, context?: Partial<LogContext>): void {
        this.logAtLevel('trace', message, context);
    }

    // =========================================================================
    // Child Logger
    // =========================================================================

    child(context: Partial<LogContext>): LoggerServiceImpl {
        const childLogger = new LoggerServiceImpl({
            name: this.name,
            base: {
                ...this.baseContext,
                ...this.getMergedContext(context),
            },
        });
        return childLogger;
    }

    // =========================================================================
    // Request Context
    // =========================================================================

    static getRequestContext(): LogContext | undefined {
        return asyncLocalStorage.getStore();
    }

    static runWithContext<T>(context: LogContext, fn: () => T): T {
        return asyncLocalStorage.run(context, fn);
    }

    static setRequestContext(context: LogContext): void {
        asyncLocalStorage.enterWith(context);
    }

    // =========================================================================
    // HTTP Interceptor Support
    // =========================================================================

    logRequest(options: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: unknown;
        requestId?: string;
        startTime: number;
        statusCode?: number;
        error?: Error;
    }): void {
        const { method, url, requestId, startTime, statusCode, error } = options;

        const context: Partial<LogContext> = {
            requestId,
            method,
            url,
            statusCode,
            responseTime: Date.now() - startTime,
        };

        if (error) {
            this.error(error, context);
        } else if (statusCode && statusCode >= 400) {
            this.warn(`${method} ${url} ${statusCode}`, context);
        } else {
            this.info(`${method} ${url} ${statusCode}`, context);
        }
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    private logAtLevel(level: LogLevel, message: string, context?: Partial<LogContext>): void {
        const mergedContext = this.getMergedContext(context);
        const logFn = this.logger[level as keyof typeof this.logger] as (
            msg: string,
            obj?: Record<string, unknown>,
        ) => void;

        if (logFn) {
            logFn.call(this.logger, message, mergedContext);
        } else {
            this.logger.info({ ...mergedContext, msg: message, level });
        }
    }

    private logError(error: Error, context?: Partial<LogContext>): void {
        const mergedContext = this.getMergedContext(context);

        const errorLog = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: (error as any).code,
            cause: error.cause instanceof Error ? error.cause.message : undefined,
        };

        this.logger.error({ ...mergedContext, err: errorLog }, error.message);
    }

    private getMergedContext(context?: Partial<LogContext>): Record<string, unknown> {
        const storeContext = asyncLocalStorage.getStore();
        return {
            ...this.baseContext,
            ...storeContext,
            ...context,
        };
    }

    private normalizeContext(context?: string | LogContext): Partial<LogContext> | undefined {
        return typeof context === 'string' ? { context } : context;
    }

    private isLogLevel(value: string): value is LogLevel {
        return ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(value);
    }
}

// Re-export for convenience
export { LoggerServiceImpl as Logger };
