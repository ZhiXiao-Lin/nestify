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
    actorId?: string;
    subjectId?: string;
    correlationId?: string;
    clientAgent?: string;
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
