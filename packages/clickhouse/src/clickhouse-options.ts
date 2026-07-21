import type { ClickHouseClientConfigOptions } from '@clickhouse/client';
import { ClickHouseConfigurationError, type ClickHouseModuleOptions } from './clickhouse.types';

const DEFAULT_URL = 'http://localhost:8123';
const DEFAULT_DATABASE = 'default';
const DEFAULT_APPLICATION = '@a3s-lab/clickhouse';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_PING_TIMEOUT_MS = 2_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_DATABASE_CLIENTS = 16;

export interface NormalizedClickHouseModuleOptions {
    clientOptions: ClickHouseClientConfigOptions;
    database: string;
    rootDatabase: string;
    requestTimeoutMs: number;
    pingTimeoutMs: number;
    shutdownTimeoutMs: number;
    maxDatabaseClients: number;
}

export function createClickHouseClientOptions(input: ClickHouseModuleOptions = {}): ClickHouseClientConfigOptions {
    return { ...normalizeClickHouseModuleOptions(input).clientOptions };
}

export function normalizeClickHouseModuleOptions(
    input: ClickHouseModuleOptions = {},
): NormalizedClickHouseModuleOptions {
    ensureObject(input, 'ClickHouse module options');
    const advancedValue: unknown = input.clientOptions ?? {};
    ensureObject(advancedValue, 'clientOptions');
    const advanced = advancedValue as ClickHouseClientConfigOptions;

    if (advanced.host !== undefined && (input.url !== undefined || advanced.url !== undefined)) {
        throw new ClickHouseConfigurationError('clientOptions.host cannot be combined with url');
    }

    const url = normalizeUrl(input.url ?? advanced.url ?? advanced.host ?? DEFAULT_URL);
    const database = normalizeRequiredString(input.database ?? advanced.database ?? DEFAULT_DATABASE, 'database');
    const rootDatabase = normalizeRequiredString(input.rootDatabase ?? DEFAULT_DATABASE, 'rootDatabase');
    const requestTimeoutMs = positiveInteger(
        input.requestTimeoutMs ?? advanced.request_timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
        'requestTimeoutMs',
    );
    const pingTimeoutMs = positiveInteger(input.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS, 'pingTimeoutMs');
    const shutdownTimeoutMs = positiveInteger(
        input.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
        'shutdownTimeoutMs',
    );
    const maxDatabaseClients = nonNegativeInteger(
        input.maxDatabaseClients ?? DEFAULT_MAX_DATABASE_CLIENTS,
        'maxDatabaseClients',
    );
    const maxOpenConnections = optionalPositiveInteger(
        input.maxOpenConnections ?? advanced.max_open_connections,
        'maxOpenConnections',
    );
    const application = normalizeRequiredString(
        input.application ?? advanced.application ?? DEFAULT_APPLICATION,
        'application',
    );
    const username = optionalNonEmptyString(input.username ?? advanced.username, 'username');
    const password = optionalString(input.password ?? advanced.password, 'password');
    const accessToken = optionalNonEmptyString(input.accessToken ?? advanced.access_token, 'accessToken');

    if (accessToken !== undefined && (username !== undefined || password !== undefined || hasUrlCredentials(url))) {
        throw new ClickHouseConfigurationError('accessToken cannot be combined with username/password authentication');
    }

    const pathname = optionalNonEmptyString(input.pathname ?? advanced.pathname, 'pathname');
    const sessionId = optionalNonEmptyString(input.sessionId ?? advanced.session_id, 'sessionId');
    const role = normalizeRole(input.role ?? advanced.role);
    const httpHeaders = normalizeHeaders(input.httpHeaders ?? advanced.http_headers);

    const clientOptions: ClickHouseClientConfigOptions = {
        ...advanced,
        url,
        database,
        request_timeout: requestTimeoutMs,
        application,
    };
    delete clientOptions.host;
    assign(clientOptions, 'username', username);
    assign(clientOptions, 'password', password);
    assign(clientOptions, 'access_token', accessToken);
    assign(clientOptions, 'pathname', pathname);
    assign(clientOptions, 'max_open_connections', maxOpenConnections);
    assign(clientOptions, 'compression', input.compression ?? advanced.compression);
    assign(clientOptions, 'keep_alive', input.keepAlive ?? advanced.keep_alive);
    assign(clientOptions, 'tls', input.tls ?? advanced.tls);
    assign(clientOptions, 'clickhouse_settings', input.clickHouseSettings ?? advanced.clickhouse_settings);
    assign(clientOptions, 'http_headers', httpHeaders);
    assign(clientOptions, 'session_id', sessionId);
    assign(clientOptions, 'role', role);
    assign(clientOptions, 'use_multipart_params', input.useMultipartParams ?? advanced.use_multipart_params);
    assign(
        clientOptions,
        'use_multipart_params_auto',
        input.useMultipartParamsAuto ?? advanced.use_multipart_params_auto,
    );

    return {
        clientOptions,
        database,
        rootDatabase,
        requestTimeoutMs,
        pingTimeoutMs,
        shutdownTimeoutMs,
        maxDatabaseClients,
    };
}

function normalizeUrl(value: string | URL): string {
    let url: URL;
    try {
        const source = value instanceof URL ? value.toString() : normalizeRequiredString(value, 'url');
        url = new URL(source);
    } catch (error) {
        if (error instanceof ClickHouseConfigurationError) {
            throw error;
        }
        throw new ClickHouseConfigurationError('url must be a valid HTTP(S) URL', error);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ClickHouseConfigurationError('url must use the http: or https: protocol');
    }
    if (url.hash) {
        throw new ClickHouseConfigurationError('url must not contain a fragment');
    }
    if (/^\/+$/u.test(url.pathname)) {
        url.pathname = '/';
    }
    const serialized = url.toString();
    return url.pathname === '/' ? serialized.replace(/\/(?=[?#]|$)/, '') : serialized;
}

function hasUrlCredentials(url: string): boolean {
    const parsed = new URL(url);
    return parsed.username.length > 0 || parsed.password.length > 0;
}

function normalizeHeaders(value: Record<string, string> | undefined): Record<string, string> | undefined {
    if (value === undefined) {
        return undefined;
    }
    ensureObject(value, 'httpHeaders');
    const headers: Record<string, string> = {};
    for (const [name, headerValue] of Object.entries(value)) {
        const normalizedName = name.trim();
        if (!normalizedName || /[\r\n]/.test(normalizedName)) {
            throw new ClickHouseConfigurationError('httpHeaders contains an invalid header name');
        }
        if (typeof headerValue !== 'string' || /[\r\n]/.test(headerValue)) {
            throw new ClickHouseConfigurationError(`httpHeaders.${normalizedName} must be a single-line string`);
        }
        headers[normalizedName] = headerValue;
    }
    return headers;
}

function normalizeRole(value: string | string[] | undefined): string | string[] | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            throw new ClickHouseConfigurationError('role must contain at least one role');
        }
        return value.map((role, index) => normalizeRequiredString(role, `role[${index}]`));
    }
    return normalizeRequiredString(value, 'role');
}

function normalizeRequiredString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ClickHouseConfigurationError(`${name} must be a non-empty string`);
    }
    return value.trim();
}

function optionalNonEmptyString(value: unknown, name: string): string | undefined {
    return value === undefined ? undefined : normalizeRequiredString(value, name);
}

function optionalString(value: unknown, name: string): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new ClickHouseConfigurationError(`${name} must be a string`);
    }
    return value;
}

function positiveInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new ClickHouseConfigurationError(`${name} must be a positive safe integer`);
    }
    return value as number;
}

function optionalPositiveInteger(value: unknown, name: string): number | undefined {
    return value === undefined ? undefined : positiveInteger(value, name);
}

function nonNegativeInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new ClickHouseConfigurationError(`${name} must be a non-negative safe integer`);
    }
    return value as number;
}

function ensureObject(value: unknown, name: string): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ClickHouseConfigurationError(`${name} must be an object`);
    }
}

function assign<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
    if (value !== undefined) {
        target[key] = value;
    }
}
