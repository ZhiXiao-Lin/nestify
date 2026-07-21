import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, type LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { type LogFn, type Logger as PinoLogger } from 'pino';
import {
    type LogContext,
    LoggerConfigurationError,
    type LoggerModuleOptions,
    type LogLevel,
    type RequestLogInput,
} from './logger.types';
import { normalizeLoggerModuleOptions } from './logger-options';

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

const RESERVED_LOG_FIELDS = new Set(['err', 'hostname', 'level', 'message', 'msg', 'name', 'pid', 'service', 'time']);

@Injectable()
export class LoggerServiceImpl implements NestLoggerService {
    private logger: PinoLogger;
    private name: string;
    private baseContext: Record<string, unknown>;

    constructor(options: LoggerModuleOptions = {}) {
        const normalized = normalizeLoggerModuleOptions(options);
        this.name = normalized.name;
        this.baseContext = normalized.base;

        const pinoOptions: pino.LoggerOptions = {
            level: normalized.level,
            name: normalized.name,
            base: {
                ...normalized.base,
                service: normalized.name,
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label: string) => ({ level: label }),
            },
            ...(normalized.redact.length > 0 && {
                redact: {
                    paths: normalized.redact,
                    censor: normalized.redactionCensor,
                },
            }),
            ...(normalized.prettyPrint && {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
            }),
        };

        try {
            this.logger = pino(pinoOptions);
        } catch (error) {
            throw new LoggerConfigurationError('Failed to create the Pino logger', { cause: error });
        }
    }

    log(message: string, context?: string | LogContext): void;
    log(level: LogLevel, message: string, context?: string): void;
    log(levelOrMessage: string | LogLevel, messageOrContext?: string | LogContext, context?: string): void {
        if (this.isLogLevel(levelOrMessage) && typeof messageOrContext === 'string') {
            this.logAtLevel(levelOrMessage, messageOrContext, this.normalizeContext(context));
            return;
        }
        this.logAtLevel('info', levelOrMessage, this.normalizeContext(messageOrContext));
    }

    /** Unambiguous level-aware alternative to the overloaded Nest LoggerService.log method. */
    write(level: LogLevel, message: string, context?: Partial<LogContext>): void {
        this.logAtLevel(level, message, context);
    }

    fatal(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('fatal', message, this.normalizeContext(context));
    }

    error(message: string, context?: Partial<LogContext> | string): void;
    error(message: string, trace: string, context: string): void;
    error(error: Error, context?: Partial<LogContext> | string): void;
    error(errorOrMessage: Error | string, contextOrTrace?: Partial<LogContext> | string, contextName?: string): void {
        const context =
            typeof contextOrTrace === 'string' && contextName !== undefined
                ? { context: contextName, stack: contextOrTrace }
                : this.normalizeContext(contextOrTrace);
        if (errorOrMessage instanceof Error) {
            this.logError(errorOrMessage, context);
        } else {
            this.logAtLevel('error', errorOrMessage, context);
        }
    }

    warn(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('warn', message, this.normalizeContext(context));
    }

    info(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('info', message, this.normalizeContext(context));
    }

    debug(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('debug', message, this.normalizeContext(context));
    }

    trace(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('trace', message, this.normalizeContext(context));
    }

    verbose(message: string, context?: Partial<LogContext> | string): void {
        this.logAtLevel('trace', message, this.normalizeContext(context));
    }

    child(context: Partial<LogContext>): LoggerServiceImpl {
        assertContext(context, 'child context');
        const child = Object.create(LoggerServiceImpl.prototype) as LoggerServiceImpl;
        child.logger = this.logger.child(
            sanitizeContext({
                ...asyncLocalStorage.getStore(),
                ...context,
            }),
        );
        child.name = this.name;
        child.baseContext = {};
        return child;
    }

    static getRequestContext(): LogContext | undefined {
        const context = asyncLocalStorage.getStore();
        return context ? { ...context } : undefined;
    }

    static runWithContext<T>(context: LogContext, fn: () => T): T {
        assertContext(context, 'request context');
        if (typeof fn !== 'function') {
            throw new TypeError('context callback must be a function');
        }
        return asyncLocalStorage.run(
            {
                ...asyncLocalStorage.getStore(),
                ...context,
            },
            fn,
        );
    }

    /** @deprecated Prefer runWithContext so the context has an explicit lifetime. */
    static setRequestContext(context: LogContext): void {
        assertContext(context, 'request context');
        asyncLocalStorage.enterWith({
            ...asyncLocalStorage.getStore(),
            ...context,
        });
    }

    logRequest(options: RequestLogInput): void {
        assertContext(options, 'request log input');
        const duration =
            options.durationMs ?? (options.startTime === undefined ? 0 : Math.max(0, Date.now() - options.startTime));
        const context: Partial<LogContext> = {
            ...options.context,
            requestId: options.requestId,
            method: options.method,
            url: options.url,
            statusCode: options.statusCode,
            responseTime: Math.max(0, Math.round(duration)),
            ...(options.headers && { requestHeaders: options.headers }),
            ...(options.body !== undefined && { requestBody: options.body }),
            ...(options.responseBody !== undefined && { responseBody: options.responseBody }),
        };

        if (options.error !== undefined) {
            this.error(toError(options.error), context);
        } else if (options.statusCode !== undefined && options.statusCode >= 400) {
            this.warn(`${options.method} ${options.url} ${options.statusCode}`, context);
        } else {
            this.info(`${options.method} ${options.url} ${options.statusCode ?? 'unknown'}`, context);
        }
    }

    private logAtLevel(level: LogLevel, message: string, context?: Partial<LogContext>): void {
        if (level === 'silent') {
            return;
        }
        const mergedContext = this.getMergedContext(context);
        const logFn = this.logger[level] as LogFn | undefined;
        if (typeof logFn === 'function') {
            logFn.call(this.logger, mergedContext, String(message));
        } else {
            this.logger.info({ ...mergedContext, requestedLevel: level }, String(message));
        }
    }

    private logError(error: Error, context?: Partial<LogContext>): void {
        const mergedContext = this.getMergedContext(context);
        const errorLog = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: errorCode(error),
            cause: errorCause(error),
        };
        this.logger.error({ ...mergedContext, err: errorLog }, error.message);
    }

    private getMergedContext(context?: Partial<LogContext>): Record<string, unknown> {
        if (context !== undefined) {
            assertContext(context, 'log context');
        }
        return sanitizeContext({
            ...this.baseContext,
            ...asyncLocalStorage.getStore(),
            ...context,
        });
    }

    private normalizeContext(context?: string | Partial<LogContext>): Partial<LogContext> | undefined {
        return typeof context === 'string' ? { context } : context;
    }

    private isLogLevel(value: string): value is LogLevel {
        return ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(value);
    }
}

function assertContext(value: unknown, name: string): asserts value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new TypeError(`${name} must be an object`);
    }
}

function errorCode(error: Error): string | undefined {
    const code = (error as Error & { code?: unknown }).code;
    return code === undefined ? undefined : String(code);
}

function errorCause(error: Error): string | undefined {
    if (error.cause === undefined) {
        return undefined;
    }
    return error.cause instanceof Error ? error.cause.message : String(error.cause);
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const reserved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
        if (RESERVED_LOG_FIELDS.has(key)) {
            reserved[key] = value;
        } else {
            sanitized[key] = value;
        }
    }
    if (Object.keys(reserved).length > 0) {
        const existing = sanitized.contextFields;
        sanitized.contextFields = {
            ...(typeof existing === 'object' && existing !== null && !Array.isArray(existing) ? existing : {}),
            ...reserved,
        };
    }
    return sanitized;
}

export { LoggerServiceImpl as Logger };
