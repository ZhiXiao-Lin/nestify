import type { ConnectionOptions, TlsOptions as NativeTlsOptions } from 'nats';
import { NatsConfigurationError, type NatsPackageOptions } from './nats.types';

const DEFAULT_SERVERS = ['nats://localhost:4222'];
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export type NatsRuntimeTlsOptions = NativeTlsOptions & { rejectUnauthorized?: boolean };

export interface NatsConnectionOptions extends Omit<ConnectionOptions, 'tls'> {
    tls?: NatsRuntimeTlsOptions;
}

export interface NormalizedNatsPackageOptions extends Omit<NatsPackageOptions, 'servers' | 'tls'> {
    servers: string[];
    requestTimeoutMs: number;
    shutdownTimeoutMs: number;
    drainOnShutdown: boolean;
    tls?: NatsRuntimeTlsOptions;
}

/** Build the exact validated options passed to the first-party NATS client. */
export function createNatsConnectionOptions(input: NatsPackageOptions): NatsConnectionOptions {
    return toNatsConnectionOptions(normalizeNatsPackageOptions(input));
}

export function normalizeNatsPackageOptions(input: NatsPackageOptions): NormalizedNatsPackageOptions {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new TypeError('module options must be an object');
        }

        const servers = normalizeServers(input.servers);
        const name = input.name ?? 'nestjs-nats';
        assertNonEmptyString(name, 'connection name');

        if (input.auth !== undefined && (!input.auth || typeof input.auth !== 'object' || Array.isArray(input.auth))) {
            throw new TypeError('auth must be an object');
        }
        if (input.tls !== undefined && (!input.tls || typeof input.tls !== 'object' || Array.isArray(input.tls))) {
            throw new TypeError('tls must be an object');
        }
        if (
            input.jetstream !== undefined &&
            (!input.jetstream || typeof input.jetstream !== 'object' || Array.isArray(input.jetstream))
        ) {
            throw new TypeError('jetstream must be an object');
        }

        const user = resolveCredential('user', input.user, input.auth?.user);
        const pass = resolveCredential('pass', input.pass, input.auth?.pass);
        const token = resolveCredential('token', input.token, input.auth?.token);
        if (token !== undefined && (user !== undefined || pass !== undefined)) {
            throw new RangeError('token authentication is mutually exclusive with username/password authentication');
        }
        if ((user === undefined) !== (pass === undefined)) {
            throw new RangeError('username and password must be configured together');
        }

        const maxReconnectAttempts = input.maxReconnectAttempts ?? -1;
        if (!Number.isInteger(maxReconnectAttempts) || maxReconnectAttempts < -1) {
            throw new RangeError('maxReconnectAttempts must be -1 or a non-negative integer');
        }
        const reconnectTimeWait = input.reconnectTimeWait ?? 2_000;
        assertNonNegativeInteger(reconnectTimeWait, 'reconnectTimeWait');
        const timeout = input.timeout ?? 10_000;
        assertPositiveInteger(timeout, 'connection timeout');
        const pingInterval = input.pingInterval ?? 60_000;
        assertPositiveInteger(pingInterval, 'pingInterval');
        const maxPingOut = input.maxPingOut ?? 2;
        assertPositiveInteger(maxPingOut, 'maxPingOut');
        const shutdownTimeoutMs = input.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
        assertPositiveInteger(shutdownTimeoutMs, 'shutdownTimeoutMs');
        const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
        assertPositiveInteger(requestTimeoutMs, 'requestTimeoutMs');
        if (input.drainOnShutdown !== undefined && typeof input.drainOnShutdown !== 'boolean') {
            throw new TypeError('drainOnShutdown must be a boolean');
        }

        const jetstream = input.jetstream ? { ...input.jetstream } : undefined;
        if (jetstream) {
            if (jetstream.enabled !== undefined && typeof jetstream.enabled !== 'boolean') {
                throw new TypeError('jetstream.enabled must be a boolean');
            }
            if (jetstream.domain !== undefined) assertNonEmptyString(jetstream.domain, 'JetStream domain');
            if (jetstream.prefix !== undefined) assertNonEmptyString(jetstream.prefix, 'JetStream API prefix');
        }

        return {
            servers,
            name,
            user,
            pass,
            token,
            maxReconnectAttempts,
            reconnectTimeWait,
            timeout,
            pingInterval,
            maxPingOut,
            tls: normalizeTlsOptions(input.tls),
            auth: input.auth ? { ...input.auth } : undefined,
            jetstream,
            shutdownTimeoutMs,
            drainOnShutdown: input.drainOnShutdown ?? true,
            requestTimeoutMs,
        };
    } catch (error) {
        if (error instanceof NatsConfigurationError) {
            throw error;
        }
        throw new NatsConfigurationError(error instanceof Error ? error.message : String(error));
    }
}

export function toNatsConnectionOptions(options: NormalizedNatsPackageOptions): NatsConnectionOptions {
    return {
        servers: options.servers,
        name: options.name,
        user: options.user,
        pass: options.pass,
        token: options.token,
        maxReconnectAttempts: options.maxReconnectAttempts,
        reconnectTimeWait: options.reconnectTimeWait,
        timeout: options.timeout,
        pingInterval: options.pingInterval,
        maxPingOut: options.maxPingOut,
        ...(options.tls && { tls: options.tls }),
    };
}

function normalizeServers(input: NatsPackageOptions['servers']): string[] {
    const values = input === undefined ? DEFAULT_SERVERS : typeof input === 'string' ? [input] : input;
    if (!Array.isArray(values) || values.length === 0) {
        throw new RangeError('servers must contain at least one server');
    }
    const servers = values.map((server, index) => {
        assertNonEmptyString(server, `servers[${index}]`);
        return server.trim();
    });
    return [...new Set(servers)];
}

function resolveCredential(name: string, direct: string | undefined, nested: string | undefined): string | undefined {
    if (direct !== undefined) assertNonEmptyString(direct, name);
    if (nested !== undefined) assertNonEmptyString(nested, `auth.${name}`);
    if (direct !== undefined && nested !== undefined && direct !== nested) {
        throw new RangeError(`${name} is configured with conflicting values`);
    }
    return direct ?? nested;
}

function normalizeTlsOptions(input: NatsPackageOptions['tls']): NatsRuntimeTlsOptions | undefined {
    if (!input) {
        return undefined;
    }
    for (const field of ['certFile', 'keyFile', 'caFile', 'cert', 'key', 'ca'] as const) {
        if (input[field] !== undefined) assertNonEmptyString(input[field], `tls.${field}`);
    }
    if (input.certFile && input.cert) throw new RangeError('tls.certFile and tls.cert are mutually exclusive');
    if (input.keyFile && input.key) throw new RangeError('tls.keyFile and tls.key are mutually exclusive');
    if (input.caFile && input.ca) throw new RangeError('tls.caFile and tls.ca are mutually exclusive');
    const hasCertificate = Boolean(input.certFile || input.cert);
    const hasKey = Boolean(input.keyFile || input.key);
    if (hasCertificate !== hasKey) {
        throw new RangeError('TLS client certificate and key must be configured together');
    }
    if (input.handshakeFirst !== undefined && typeof input.handshakeFirst !== 'boolean') {
        throw new TypeError('tls.handshakeFirst must be a boolean');
    }
    if (input.verify !== undefined && typeof input.verify !== 'boolean') {
        throw new TypeError('tls.verify must be a boolean');
    }
    if (input.rejectUnauthorized !== undefined && typeof input.rejectUnauthorized !== 'boolean') {
        throw new TypeError('tls.rejectUnauthorized must be a boolean');
    }
    if (
        input.verify !== undefined &&
        input.rejectUnauthorized !== undefined &&
        input.verify !== input.rejectUnauthorized
    ) {
        throw new RangeError('tls.verify and tls.rejectUnauthorized must agree when both are configured');
    }

    return {
        ...(input.handshakeFirst !== undefined && { handshakeFirst: input.handshakeFirst }),
        ...(input.certFile && { certFile: input.certFile }),
        ...(input.keyFile && { keyFile: input.keyFile }),
        ...(input.caFile && { caFile: input.caFile }),
        ...(input.cert && { cert: input.cert }),
        ...(input.key && { key: input.key }),
        ...(input.ca && { ca: input.ca }),
        rejectUnauthorized: input.rejectUnauthorized ?? input.verify ?? true,
    };
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${name} must be a non-empty string`);
    }
}

function assertPositiveInteger(value: unknown, name: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new RangeError(`${name} must be a positive integer`);
    }
}

function assertNonNegativeInteger(value: unknown, name: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative integer`);
    }
}
