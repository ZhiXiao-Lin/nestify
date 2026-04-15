// ============================================================================
// Logger Types - Structured logging with request tracing
// ============================================================================

export interface LoggerModuleOptions {
    level?: LogLevel;
    name?: string;
    prettyPrint?: boolean;
    json?: boolean;
    redact?: string[];
    base?: Record<string, unknown>;
}

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface LogContext {
    requestId?: string;
    userId?: string;
    organizationId?: string;
    correlationId?: string;
    userAgent?: string;
    ip?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
    [key: string]: unknown;
}

export interface LogEntry {
    level: LogLevel;
    time: string;
    name: string;
    msg: string;
    context?: LogContext;
    err?: ErrorLog;
    stack?: string;
}

export interface ErrorLog {
    message: string;
    name: string;
    stack?: string;
    cause?: string;
    code?: string;
}

export interface LoggerService {
    fatal(message: string, context?: Partial<LogContext>): void;
    error(message: string, context?: Partial<LogContext>): void;
    error(error: Error, context?: Partial<LogContext>): void;
    warn(message: string, context?: Partial<LogContext>): void;
    info(message: string, context?: Partial<LogContext>): void;
    debug(message: string, context?: Partial<LogContext>): void;
    trace(message: string, context?: Partial<LogContext>): void;

    log(level: LogLevel, message: string, context?: Partial<LogContext>): void;
    child(context: Partial<LogContext>): LoggerService;
}

export interface RequestLoggingOptions {
    excludePaths?: string[];
    includeBody?: boolean;
    excludeBody?: boolean;
    headerName?: string;
    requestIdHeader?: string;
}

export interface LogInterceptorOptions {
    excludePaths?: string[];
    logRequestBody?: boolean;
    logResponseBody?: boolean;
    logRequestHeaders?: boolean;
}
