import {
    LoggerConfigurationError,
    type LoggerModuleOptions,
    type LoggerRuntimeEnvironment,
    type LogInterceptorOptions,
    type LogLevel,
    type NormalizedLogInterceptorOptions,
} from './logger.types';

const LOG_LEVELS: ReadonlySet<LogLevel> = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const RESERVED_LOG_FIELDS = new Set(['err', 'hostname', 'level', 'message', 'msg', 'name', 'pid', 'service', 'time']);
const MAX_REDACTION_PATHS = 256;
const MAX_EXCLUDE_PATHS = 128;
const MAX_REQUEST_ID_HEADERS = 16;
const MAX_REQUEST_ID_LENGTH_LIMIT = 1_024;

export const DEFAULT_LOG_REDACTION_PATHS = Object.freeze([
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'authorization',
    'cookie',
    'headers.authorization',
    'headers.cookie',
    'headers["set-cookie"]',
    'requestHeaders.authorization',
    'requestHeaders.cookie',
    'requestHeaders["set-cookie"]',
    'requestBody.password',
    'requestBody.token',
    'requestBody.accessToken',
    'requestBody.refreshToken',
    'requestBody.apiKey',
    'responseBody.token',
    'responseBody.accessToken',
    'responseBody.refreshToken',
] as const);

export const DEFAULT_LOG_EXCLUDE_PATHS = Object.freeze(['/health', '/healthz', '/ready', '/metrics'] as const);
export const DEFAULT_REQUEST_ID_HEADERS = Object.freeze(['x-request-id', 'x-correlation-id'] as const);
export const DEFAULT_REQUEST_ID_HEADER = 'x-request-id';
export const DEFAULT_MAX_REQUEST_ID_LENGTH = 128;

export interface NormalizedLoggerModuleOptions {
    level: LogLevel;
    name: string;
    prettyPrint: boolean;
    redact: string[];
    redactionCensor: string;
    base: Record<string, unknown>;
    interceptor: NormalizedLogInterceptorOptions;
}

export function createLoggerModuleOptions(input: LoggerModuleOptions = {}): LoggerModuleOptions {
    const normalized = normalizeLoggerModuleOptions(input);
    return {
        level: normalized.level,
        name: normalized.name,
        prettyPrint: normalized.prettyPrint,
        json: !normalized.prettyPrint,
        redact: input.redact === false ? false : normalized.redact,
        redactionCensor: normalized.redactionCensor,
        base: normalized.base,
        interceptor: normalized.interceptor,
    };
}

export function normalizeLoggerModuleOptions(
    input: LoggerModuleOptions = {},
    environment: LoggerRuntimeEnvironment = { NODE_ENV: process.env.NODE_ENV },
): NormalizedLoggerModuleOptions {
    ensureObject(input, 'Logger module options');
    ensureObject(environment, 'Logger runtime environment');

    const level = input.level ?? 'info';
    if (!LOG_LEVELS.has(level)) {
        throw new LoggerConfigurationError(`Unsupported log level: ${String(level)}`);
    }

    const name = optionalSingleLineString(input.name, 'name', 128) ?? 'app';
    const prettyPrintOption = optionalBoolean(input.prettyPrint, 'prettyPrint');
    const json = optionalBoolean(input.json, 'json');
    const prettyPrint =
        prettyPrintOption ?? (json === false || (json === undefined && environment.NODE_ENV === 'development'));
    const base = normalizeBase(input.base);
    const redactionCensor = optionalSingleLineString(input.redactionCensor, 'redactionCensor', 256) ?? '[Redacted]';
    const redact = normalizeRedaction(input.redact);

    return {
        level,
        name,
        prettyPrint,
        redact,
        redactionCensor,
        base,
        interceptor: normalizeLogInterceptorOptions(input.interceptor),
    };
}

export function normalizeLogInterceptorOptions(input: LogInterceptorOptions = {}): NormalizedLogInterceptorOptions {
    ensureObject(input, 'log interceptor options');
    const excludePaths = normalizePaths(input.excludePaths);
    const requestIdHeaders = normalizeHeaderNames(input.requestIdHeaders ?? [...DEFAULT_REQUEST_ID_HEADERS]);
    if (requestIdHeaders.length === 0) {
        throw new LoggerConfigurationError('requestIdHeaders must contain at least one header name');
    }

    let responseRequestIdHeader: string | false = DEFAULT_REQUEST_ID_HEADER;
    if (input.responseRequestIdHeader === false) {
        responseRequestIdHeader = false;
    } else if (input.responseRequestIdHeader !== undefined) {
        responseRequestIdHeader = normalizeHeaderName(input.responseRequestIdHeader, 'responseRequestIdHeader');
    }

    return {
        excludePaths,
        logRequestBody: optionalBoolean(input.logRequestBody, 'logRequestBody') ?? false,
        logResponseBody: optionalBoolean(input.logResponseBody, 'logResponseBody') ?? false,
        logRequestHeaders: optionalBoolean(input.logRequestHeaders, 'logRequestHeaders') ?? false,
        requestIdHeaders,
        responseRequestIdHeader,
        maxRequestIdLength: boundedPositiveInteger(
            input.maxRequestIdLength ?? DEFAULT_MAX_REQUEST_ID_LENGTH,
            'maxRequestIdLength',
            MAX_REQUEST_ID_LENGTH_LIMIT,
        ),
    };
}

function normalizeRedaction(value: LoggerModuleOptions['redact']): string[] {
    if (value === false) {
        return [];
    }
    if (value !== undefined && !Array.isArray(value)) {
        throw new LoggerConfigurationError('redact must be an array of Pino paths or false');
    }
    if ((value?.length ?? 0) > MAX_REDACTION_PATHS) {
        throw new LoggerConfigurationError(`redact cannot contain more than ${MAX_REDACTION_PATHS} paths`);
    }
    const paths: string[] = [...DEFAULT_LOG_REDACTION_PATHS];
    for (const [index, path] of (value ?? []).entries()) {
        paths.push(requiredSingleLineString(path, `redact[${index}]`, 512));
    }
    return [...new Set(paths)];
}

function normalizePaths(value: string[] | undefined): string[] {
    if (value === undefined) {
        return [...DEFAULT_LOG_EXCLUDE_PATHS];
    }
    if (!Array.isArray(value)) {
        throw new LoggerConfigurationError('excludePaths must be an array');
    }
    if (value.length > MAX_EXCLUDE_PATHS) {
        throw new LoggerConfigurationError(`excludePaths cannot contain more than ${MAX_EXCLUDE_PATHS} paths`);
    }
    return [
        ...new Set(
            value.map((path, index) => {
                const normalized = requiredSingleLineString(path, `excludePaths[${index}]`, 2_048);
                if (!normalized.startsWith('/')) {
                    throw new LoggerConfigurationError(`excludePaths[${index}] must start with /`);
                }
                return normalized.length > 1 ? normalized.replace(/\/+$/u, '') : normalized;
            }),
        ),
    ];
}

function normalizeHeaderNames(value: string[]): string[] {
    if (!Array.isArray(value)) {
        throw new LoggerConfigurationError('requestIdHeaders must be an array');
    }
    if (value.length > MAX_REQUEST_ID_HEADERS) {
        throw new LoggerConfigurationError(
            `requestIdHeaders cannot contain more than ${MAX_REQUEST_ID_HEADERS} header names`,
        );
    }
    return [...new Set(value.map((name, index) => normalizeHeaderName(name, `requestIdHeaders[${index}]`)))];
}

function normalizeHeaderName(value: unknown, name: string): string {
    const normalized = requiredSingleLineString(value, name, 256).toLowerCase();
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/u.test(normalized)) {
        throw new LoggerConfigurationError(`${name} must be a valid HTTP header name`);
    }
    return normalized;
}

function normalizeBase(value: unknown): Record<string, unknown> {
    if (value === undefined) {
        return {};
    }
    ensureObject(value, 'base');
    const base = { ...(value as Record<string, unknown>) };
    for (const field of Object.keys(base)) {
        if (RESERVED_LOG_FIELDS.has(field)) {
            throw new LoggerConfigurationError(`base.${field} is reserved by the logger`);
        }
    }
    return base;
}

function optionalSingleLineString(value: unknown, name: string, maxLength: number): string | undefined {
    return value === undefined ? undefined : requiredSingleLineString(value, name, maxLength);
}

function requiredSingleLineString(value: unknown, name: string, maxLength: number): string {
    if (typeof value !== 'string' || value.trim().length === 0 || /[\r\n]/u.test(value)) {
        throw new LoggerConfigurationError(`${name} must be a non-empty single-line string`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
        throw new LoggerConfigurationError(`${name} cannot exceed ${maxLength} characters`);
    }
    return normalized;
}

function optionalBoolean(value: unknown, name: string): boolean | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'boolean') {
        throw new LoggerConfigurationError(`${name} must be a boolean`);
    }
    return value;
}

function boundedPositiveInteger(value: unknown, name: string, maximum: number): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new LoggerConfigurationError(`${name} must be a positive safe integer`);
    }
    if ((value as number) > maximum) {
        throw new LoggerConfigurationError(`${name} cannot exceed ${maximum}`);
    }
    return value as number;
}

function ensureObject(value: unknown, name: string): asserts value is object {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new LoggerConfigurationError(`${name} must be an object`);
    }
}
