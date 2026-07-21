export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface LoggerModuleOptions {
    level?: LogLevel;
    name?: string;
    /** Explicitly enable or disable pino-pretty output. */
    prettyPrint?: boolean;
    /** `false` enables pretty output unless prettyPrint explicitly overrides it. */
    json?: boolean;
    /** Additional Pino redaction paths, or false to explicitly disable default redaction. */
    redact?: string[] | false;
    redactionCensor?: string;
    base?: Record<string, unknown>;
    interceptor?: LogInterceptorOptions;
}

export interface LoggerRuntimeEnvironment {
    NODE_ENV?: string;
}

export interface LogContext {
    requestId?: string;
    actorId?: string;
    subjectId?: string;
    correlationId?: string;
    clientAgent?: string;
    ip?: string;
    method?: string;
    url?: string;
    route?: string;
    statusCode?: number;
    responseTime?: number;
    requestHeaders?: Record<string, string | string[]>;
    requestBody?: unknown;
    responseBody?: unknown;
    /** Reserved Pino fields supplied by callers are preserved here instead of overriding log metadata. */
    contextFields?: Record<string, unknown>;
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

/** @deprecated Configure LoggerModuleOptions.interceptor instead. */
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
    /** Header names checked in order for an inbound request id. */
    requestIdHeaders?: string[];
    /** Response header carrying the normalized request id, or false to disable it. */
    responseRequestIdHeader?: string | false;
    /** Maximum accepted inbound request id length. Defaults to 128. */
    maxRequestIdLength?: number;
}

export interface NormalizedLogInterceptorOptions {
    excludePaths: string[];
    logRequestBody: boolean;
    logResponseBody: boolean;
    logRequestHeaders: boolean;
    requestIdHeaders: string[];
    responseRequestIdHeader: string | false;
    maxRequestIdLength: number;
}

export interface RequestLogInput {
    method: string;
    url: string;
    requestId?: string;
    startTime?: number;
    durationMs?: number;
    statusCode?: number;
    error?: unknown;
    headers?: Record<string, string | string[]>;
    body?: unknown;
    responseBody?: unknown;
    context?: Partial<LogContext>;
}

export class LoggerConfigurationError extends Error {
    readonly code = 'LOGGER_CONFIGURATION_ERROR';
    readonly statusCode = 500;

    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'LoggerConfigurationError';
    }
}
