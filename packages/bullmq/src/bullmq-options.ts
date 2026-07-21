import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';
import {
    BullMQConfigurationError,
    type BullMQModuleOptions,
    type BullMQQueueEventsOptions,
    type BullMQQueueOptions,
    type BullMQWorkerDefaults,
} from './bullmq.types';

export const DEFAULT_BULLMQ_SHUTDOWN_TIMEOUT_MS = 10_000;
export const DEFAULT_BULLMQ_HEALTH_TIMEOUT_MS = 2_000;

export interface NormalizedBullMQModuleOptions {
    connection: ConnectionOptions;
    defaultJobOptions?: DefaultJobOptions;
    prefix?: string;
    queueOptions: BullMQQueueOptions;
    workerOptions: BullMQWorkerDefaults;
    queueEventsOptions: BullMQQueueEventsOptions;
    shutdownTimeoutMs: number;
    healthTimeoutMs: number;
    forceWorkerCloseOnTimeout: boolean;
}

export function createBullMQModuleOptions(input: BullMQModuleOptions): BullMQModuleOptions {
    const normalized = normalizeBullMQModuleOptions(input);
    return {
        connection: normalized.connection,
        ...(normalized.defaultJobOptions && {
            defaultJobOptions: normalized.defaultJobOptions,
        }),
        ...(normalized.prefix && { prefix: normalized.prefix }),
        ...(Object.keys(normalized.queueOptions).length > 0 && {
            queueOptions: normalized.queueOptions,
        }),
        ...(Object.keys(normalized.workerOptions).length > 0 && {
            workerOptions: normalized.workerOptions,
        }),
        ...(Object.keys(normalized.queueEventsOptions).length > 0 && {
            queueEventsOptions: normalized.queueEventsOptions,
        }),
        shutdownTimeoutMs: normalized.shutdownTimeoutMs,
        healthTimeoutMs: normalized.healthTimeoutMs,
        forceWorkerCloseOnTimeout: normalized.forceWorkerCloseOnTimeout,
    };
}

export function normalizeBullMQModuleOptions(input: BullMQModuleOptions): NormalizedBullMQModuleOptions {
    ensureObject(input, 'BullMQ module options');
    const connection = validateConnection(input.connection);
    const prefix = optionalSingleLineString(input.prefix, 'prefix');
    const defaultJobOptions =
        input.defaultJobOptions === undefined
            ? undefined
            : optionalOptions<DefaultJobOptions>(input.defaultJobOptions, 'defaultJobOptions');
    const queueOptions = optionalOptions<BullMQQueueOptions>(input.queueOptions, 'queueOptions');
    const workerOptions = optionalOptions<BullMQWorkerDefaults>(input.workerOptions, 'workerOptions');
    const queueEventsOptions = optionalOptions<BullMQQueueEventsOptions>(
        input.queueEventsOptions,
        'queueEventsOptions',
    );

    rejectOwnedFields(queueOptions, 'queueOptions', ['connection', 'defaultJobOptions', 'prefix']);
    rejectOwnedFields(workerOptions, 'workerOptions', ['connection', 'prefix']);
    rejectOwnedFields(queueEventsOptions, 'queueEventsOptions', ['connection', 'prefix']);
    if (workerOptions.concurrency !== undefined) {
        positiveInteger(workerOptions.concurrency, 'workerOptions.concurrency');
    }
    if (queueEventsOptions.blockingTimeout !== undefined) {
        positiveInteger(queueEventsOptions.blockingTimeout, 'queueEventsOptions.blockingTimeout');
    }

    return {
        connection,
        defaultJobOptions,
        prefix,
        queueOptions,
        workerOptions,
        queueEventsOptions,
        shutdownTimeoutMs: positiveInteger(
            input.shutdownTimeoutMs ?? DEFAULT_BULLMQ_SHUTDOWN_TIMEOUT_MS,
            'shutdownTimeoutMs',
        ),
        healthTimeoutMs: positiveInteger(input.healthTimeoutMs ?? DEFAULT_BULLMQ_HEALTH_TIMEOUT_MS, 'healthTimeoutMs'),
        forceWorkerCloseOnTimeout: optionalBoolean(input.forceWorkerCloseOnTimeout, 'forceWorkerCloseOnTimeout', true),
    };
}

function validateConnection(value: unknown): ConnectionOptions {
    if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
        throw new BullMQConfigurationError('connection must be a BullMQ connection object or Redis client');
    }

    const connection = value as Record<string, unknown>;
    if (hasOwn(connection, 'host')) {
        optionalSingleLineString(connection.host, 'connection.host');
    }
    if (hasOwn(connection, 'port') && connection.port !== undefined) {
        positiveInteger(connection.port, 'connection.port');
    }
    if (hasOwn(connection, 'db') && connection.db !== undefined) {
        nonNegativeInteger(connection.db, 'connection.db');
    }

    return value as ConnectionOptions;
}

function optionalOptions<T extends object>(value: unknown, name: string): T {
    if (value === undefined) {
        return {} as T;
    }
    ensureObject(value, name);
    return { ...(value as T) };
}

function rejectOwnedFields(value: object, name: string, fields: readonly string[]): void {
    for (const field of fields) {
        if (hasOwn(value, field)) {
            throw new BullMQConfigurationError(`${name}.${field} is managed by the module`);
        }
    }
}

function optionalSingleLineString(value: unknown, name: string): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string' || value.trim().length === 0 || /[\r\n]/u.test(value)) {
        throw new BullMQConfigurationError(`${name} must be a non-empty single-line string`);
    }
    return value;
}

function optionalBoolean(value: unknown, name: string, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== 'boolean') {
        throw new BullMQConfigurationError(`${name} must be a boolean`);
    }
    return value;
}

function positiveInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new BullMQConfigurationError(`${name} must be a positive safe integer`);
    }
    return value as number;
}

function nonNegativeInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) < 0) {
        throw new BullMQConfigurationError(`${name} must be a non-negative safe integer`);
    }
    return value as number;
}

function ensureObject(value: unknown, name: string): asserts value is object {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new BullMQConfigurationError(`${name} must be an object`);
    }
}

function hasOwn(value: object, key: string): boolean {
    return Object.getOwnPropertyDescriptor(value, key) !== undefined;
}
