import {
    BullMQConfigurationError,
    type BullMQModuleOptions,
    BullMQPackageError,
    BullMQRequestError,
    BullMQServiceClosedError,
    BullMQShutdownError,
    BullMQWorkerConflictError,
} from '../bullmq.types';
import {
    createBullMQModuleOptions,
    DEFAULT_BULLMQ_HEALTH_TIMEOUT_MS,
    DEFAULT_BULLMQ_SHUTDOWN_TIMEOUT_MS,
    normalizeBullMQModuleOptions,
} from '../bullmq-options';

describe('BullMQ options', () => {
    it('normalizes defaults while preserving the connection object', () => {
        const connection = { host: 'redis', port: 6379 };
        const options = normalizeBullMQModuleOptions({ connection });

        expect(options).toEqual({
            connection,
            defaultJobOptions: undefined,
            prefix: undefined,
            queueOptions: {},
            workerOptions: {},
            queueEventsOptions: {},
            shutdownTimeoutMs: DEFAULT_BULLMQ_SHUTDOWN_TIMEOUT_MS,
            healthTimeoutMs: DEFAULT_BULLMQ_HEALTH_TIMEOUT_MS,
            forceWorkerCloseOnTimeout: true,
        });
        expect(options.connection).toBe(connection);
    });

    it('accepts explicitly undefined optional Redis connection fields', () => {
        expect(
            normalizeBullMQModuleOptions({
                connection: { host: undefined, port: undefined, db: undefined },
            }).connection,
        ).toEqual({ host: undefined, port: undefined, db: undefined });
    });

    it('copies first-party option groups and applies lifecycle settings', () => {
        const defaultJobOptions = { attempts: 3 };
        const queueOptions = { skipVersionCheck: true };
        const workerOptions = { concurrency: 4 };
        const queueEventsOptions = { autorun: false };
        const normalized = normalizeBullMQModuleOptions({
            connection: { host: 'redis', port: 6380, db: 2 },
            prefix: 'app',
            defaultJobOptions,
            queueOptions,
            workerOptions,
            queueEventsOptions,
            shutdownTimeoutMs: 5_000,
            healthTimeoutMs: 500,
            forceWorkerCloseOnTimeout: false,
        });

        expect(normalized).toMatchObject({
            prefix: 'app',
            shutdownTimeoutMs: 5_000,
            healthTimeoutMs: 500,
            forceWorkerCloseOnTimeout: false,
        });
        expect(normalized.defaultJobOptions).toEqual(defaultJobOptions);
        expect(normalized.defaultJobOptions).not.toBe(defaultJobOptions);
        expect(normalized.queueOptions).not.toBe(queueOptions);
        expect(normalized.workerOptions).not.toBe(workerOptions);
        expect(normalized.queueEventsOptions).not.toBe(queueEventsOptions);
    });

    it('creates validated public module options without empty advanced groups', () => {
        const connection = { host: 'redis', port: 6379 };
        expect(createBullMQModuleOptions({ connection })).toEqual({
            connection,
            shutdownTimeoutMs: DEFAULT_BULLMQ_SHUTDOWN_TIMEOUT_MS,
            healthTimeoutMs: DEFAULT_BULLMQ_HEALTH_TIMEOUT_MS,
            forceWorkerCloseOnTimeout: true,
        });

        expect(
            createBullMQModuleOptions({
                connection,
                prefix: 'app',
                defaultJobOptions: { attempts: 2 },
                queueOptions: { skipWaitingForReady: true },
                workerOptions: { concurrency: 2 },
                queueEventsOptions: { autorun: false },
            }),
        ).toMatchObject({
            prefix: 'app',
            defaultJobOptions: { attempts: 2 },
            queueOptions: { skipWaitingForReady: true },
            workerOptions: { concurrency: 2 },
            queueEventsOptions: { autorun: false },
        });
    });

    it.each([
        [null, 'BullMQ module options must be an object'],
        [[], 'BullMQ module options must be an object'],
        [{}, 'connection must be a BullMQ connection object or Redis client'],
        [{ connection: 'redis://localhost' }, 'connection must be a BullMQ connection object or Redis client'],
        [{ connection: { host: '', port: 6379 } }, 'connection.host must be a non-empty single-line string'],
        [{ connection: { host: 'redis', port: 0 } }, 'connection.port must be a positive safe integer'],
        [{ connection: { host: 'redis', port: 6379, db: -1 } }, 'connection.db must be a non-negative safe integer'],
    ])('rejects invalid module or connection input %#', (input, message) => {
        expect(() => normalizeBullMQModuleOptions(input as BullMQModuleOptions)).toThrow(message as string);
    });

    it.each([
        [{ prefix: '\n' }, 'prefix must be a non-empty single-line string'],
        [{ shutdownTimeoutMs: 0 }, 'shutdownTimeoutMs must be a positive safe integer'],
        [{ healthTimeoutMs: 1.5 }, 'healthTimeoutMs must be a positive safe integer'],
        [{ forceWorkerCloseOnTimeout: 'yes' }, 'forceWorkerCloseOnTimeout must be a boolean'],
        [{ defaultJobOptions: [] }, 'defaultJobOptions must be an object'],
        [{ queueOptions: null }, 'queueOptions must be an object'],
        [{ workerOptions: { concurrency: 0 } }, 'workerOptions.concurrency must be a positive safe integer'],
        [
            { queueEventsOptions: { blockingTimeout: 0 } },
            'queueEventsOptions.blockingTimeout must be a positive safe integer',
        ],
    ])('rejects invalid option input %#', (overrides, message) => {
        expect(() =>
            normalizeBullMQModuleOptions({
                connection: { host: 'redis', port: 6379 },
                ...overrides,
            } as BullMQModuleOptions),
        ).toThrow(message as string);
    });

    it.each([
        ['queueOptions', 'connection'],
        ['queueOptions', 'defaultJobOptions'],
        ['queueOptions', 'prefix'],
        ['workerOptions', 'connection'],
        ['workerOptions', 'prefix'],
        ['queueEventsOptions', 'connection'],
        ['queueEventsOptions', 'prefix'],
    ])('rejects module-owned %s.%s fields at runtime', (group, field) => {
        expect(() =>
            normalizeBullMQModuleOptions({
                connection: { host: 'redis', port: 6379 },
                [group]: { [field]: 'unexpected' },
            } as unknown as BullMQModuleOptions),
        ).toThrow(`${group}.${field} is managed by the module`);
    });

    it('exposes stable structured package errors', () => {
        const cause = new Error('cause');
        const configuration = new BullMQConfigurationError('bad config', cause);
        const request = new BullMQRequestError('bad request');
        const closed = new BullMQServiceClosedError();
        const conflict = new BullMQWorkerConflictError('worker', 'first', 'second');
        const shutdown = new BullMQShutdownError([cause]);

        expect(configuration).toBeInstanceOf(BullMQPackageError);
        expect(configuration).toMatchObject({ code: 'BULLMQ_CONFIGURATION_ERROR', statusCode: 500, cause });
        expect(request).toMatchObject({ code: 'BULLMQ_REQUEST_ERROR', statusCode: 400 });
        expect(closed).toMatchObject({ code: 'BULLMQ_SERVICE_CLOSED', statusCode: 503 });
        expect(conflict).toMatchObject({ code: 'BULLMQ_WORKER_CONFLICT', statusCode: 409 });
        expect(shutdown).toMatchObject({ code: 'BULLMQ_SHUTDOWN_ERROR', errors: [cause] });
        expect(shutdown.cause).toBeInstanceOf(AggregateError);
    });
});
