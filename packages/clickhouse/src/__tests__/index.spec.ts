import { createClient } from '@clickhouse/client';
import {
    CLICKHOUSE_OPTIONS_TOKEN,
    ClickHouseClientPoolExhaustedError,
    ClickHouseModule,
    ClickHouseRequestError,
    ClickHouseService,
    ClickHouseServiceClosedError,
    ClickHouseShutdownError,
    createClickHouseClientOptions,
} from '../index';

jest.mock('@clickhouse/client', () => ({
    createClient: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('clickhouse package', () => {
    beforeEach(() => {
        mockedCreateClient.mockReset();
        mockedCreateClient.mockImplementation(() => createMockClient() as never);
    });

    it('exports static and async Nest module registrations', () => {
        const options = { url: 'http://clickhouse:8123', database: 'analytics' };
        const staticModule = ClickHouseModule.register(options);
        const factory = jest.fn(() => options);
        const asyncModule = ClickHouseModule.registerAsync({
            imports: [],
            inject: ['CONFIG'],
            useFactory: factory,
        });

        expect(staticModule).toEqual({
            module: ClickHouseModule,
            providers: [{ provide: CLICKHOUSE_OPTIONS_TOKEN, useValue: options }, ClickHouseService],
            exports: [ClickHouseService],
        });
        expect(asyncModule.module).toBe(ClickHouseModule);
        expect(asyncModule.imports).toEqual([]);
        expect(asyncModule.providers).toEqual([
            {
                provide: CLICKHOUSE_OPTIONS_TOKEN,
                useFactory: factory,
                inject: ['CONFIG'],
            },
            ClickHouseService,
        ]);
        expect(createClickHouseClientOptions).toBeInstanceOf(Function);
    });

    it('normalizes client options before creating the default client', () => {
        new ClickHouseService({
            url: 'http://clickhouse:8123///',
            username: 'default',
            password: 'secret',
            database: ' analytics ',
            application: 'api',
        });

        expect(mockedCreateClient).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'http://clickhouse:8123',
                username: 'default',
                password: 'secret',
                database: 'analytics',
                request_timeout: 10_000,
                application: 'api',
            }),
        );
    });

    it('routes result statements safely through query and commands through command', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ url: 'http://clickhouse:8123' });

        await expect(service.execute('/* leading comment */ SELECT 1 FORMAT JSON; -- trailing comment')).resolves.toBe(
            'query-result',
        );
        await expect(service.execute('WITH 1 AS value SELECT value')).resolves.toBe('query-result');
        await expect(service.execute('create table events (id UInt64)')).resolves.toBe('');

        expect(client.query).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                query: '/* leading comment */ SELECT 1',
                format: 'JSON',
            }),
        );
        expect(client.command).toHaveBeenCalledWith(
            expect.objectContaining({ query: 'create table events (id UInt64)' }),
        );
    });

    it('does not treat FORMAT text inside strings or comments as a trailing format clause', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({});

        await service.queryText("select 'FORMAT CSV' as value -- FORMAT JSON");
        await service.queryText("select 'it\\'s FORMAT CSV' as value");
        await service.queryText("select 'it''s FORMAT CSV' as value");

        expect(client.query).toHaveBeenCalledWith(
            expect.objectContaining({
                query: "select 'FORMAT CSV' as value",
                format: 'TabSeparated',
            }),
        );
    });

    it('validates query formats and JSON response contracts', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({});

        await expect(service.queryJson<{ id: number }>('select 1 FORMAT JSON')).resolves.toEqual({
            data: [{ id: 1 }],
        });
        await expect(service.queryJson('select 1 FORMAT CSV')).rejects.toThrow(
            'queryJson only supports the JSON response format',
        );
        await expect(service.queryText('select 1 FORMAT UnknownRows')).rejects.toThrow(
            "Unsupported ClickHouse response format 'UnknownRows'",
        );
        await expect(service.queryText("select 1 FORMAT 'JSON'")).rejects.toThrow(
            'FORMAT must be followed by a supported format name',
        );
        await expect(service.queryText('FORMAT JSON')).rejects.toThrow('SQL before FORMAT must not be empty');
        await expect(service.queryText(' -- only a comment')).rejects.toThrow('sql must contain a statement');
    });

    it('forwards complete request context and composes caller cancellation with timeout', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ requestTimeoutMs: 5_000 });
        const controller = new AbortController();

        await service.command('optimize table events', {
            queryId: 'query-1',
            clickHouseSettings: { max_threads: 2 },
            queryParams: { tenant: 'a3s' },
            timeoutMs: 100,
            abortSignal: controller.signal,
            sessionId: 'session-1',
            role: ['reader'],
            auth: { username: 'api', password: 'secret' },
            httpHeaders: { 'x-request-id': 'request-1' },
            useMultipartParams: true,
            useMultipartParamsAuto: false,
        });

        const request = client.command.mock.calls[0][0];
        expect(request).toMatchObject({
            query: 'optimize table events',
            query_id: 'query-1',
            clickhouse_settings: { max_threads: 2 },
            query_params: { tenant: 'a3s' },
            session_id: 'session-1',
            role: ['reader'],
            auth: { username: 'api', password: 'secret' },
            http_headers: { 'x-request-id': 'request-1' },
            use_multipart_params: true,
            use_multipart_params_auto: false,
        });
        expect(request.abort_signal).toBeInstanceOf(AbortSignal);
        expect(request.abort_signal).not.toBe(controller.signal);
        controller.abort();
        expect(request.abort_signal?.aborted).toBe(true);
    });

    it.each([
        ['', {}, 'sql must be a non-empty string'],
        ['select 1', { timeoutMs: 0 }, 'timeoutMs must be a positive safe integer'],
        ['select 1', { queryId: ' ' }, 'queryId must be a non-empty string'],
        ['select 1', { database: ' ' }, 'database must be a non-empty string or null'],
        ['select 1', { role: [] }, 'role must contain at least one role'],
        ['select 1', { auth: { username: 'api' } }, 'auth.password must be a string'],
        ['select 1', { auth: { access_token: '', username: 'api' } }, 'auth.access_token must be a non-empty string'],
        ['select 1', { auth: { access_token: 'token', username: 'api' } }, 'JWT auth cannot be combined'],
        ['select 1', { auth: null }, 'auth must be an object'],
        ['select 1', { httpHeaders: { good: 'bad\nvalue' } }, 'must be a single-line string'],
        ['select 1', { httpHeaders: { ' ': 'value' } }, 'invalid header name'],
        ['select 1', { httpHeaders: [] }, 'httpHeaders must be an object'],
        ['select 1', { abortSignal: {} }, 'abortSignal must be an AbortSignal'],
        ['select 1', { queryParams: [] }, 'queryParams must be an object'],
        ['select 1', { clickHouseSettings: [] }, 'clickHouseSettings must be an object'],
    ] as const)('rejects malformed requests %#', async (sql, options, message) => {
        const service = new ClickHouseService({});
        await expect(service.command(sql, options as never)).rejects.toThrow(message);
    });

    it('preserves the compatibility insert helper and exposes insert results', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({});

        await service.insertJsonEachRow('events', []);
        await service.insertJsonEachRow(' events ', [{ id: 1, name: 'created' }]);
        await expect(service.insert('events', [])).resolves.toMatchObject({
            executed: true,
            query_id: 'insert-id',
        });

        expect(client.insert).toHaveBeenCalledTimes(2);
        expect(client.insert).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                table: 'events',
                values: [{ id: 1, name: 'created' }],
                format: 'JSONEachRow',
            }),
        );
    });

    it.each([
        [' ', []],
        ['events\nDROP TABLE users', []],
        ['events', {}],
    ])('rejects unsafe insert input %#', async (table, rows) => {
        const service = new ClickHouseService({});
        await expect(service.insertJsonEachRow(table, rows as never)).rejects.toBeInstanceOf(ClickHouseRequestError);
    });

    it('single-flights concurrent database client creation', async () => {
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient();
        mockedCreateClient.mockReturnValueOnce(defaultClient as never).mockReturnValueOnce(analyticsClient as never);
        const service = new ClickHouseService({ database: 'default' });

        await Promise.all([
            service.command('optimize table events', { database: 'analytics' }),
            service.command('optimize table visits', { database: 'analytics' }),
        ]);

        expect(mockedCreateClient).toHaveBeenCalledTimes(2);
        expect(analyticsClient.command).toHaveBeenCalledTimes(2);
        await service.command('optimize table cached', { database: 'analytics', role: ' reader ' });
        expect(analyticsClient.command).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'reader' }));
        expect(service.getStats()).toMatchObject({
            activeOperations: 0,
            cachedDatabaseClients: 1,
            databases: ['default', 'analytics'],
            closing: false,
        });
    });

    it('evicts the least recently used idle database client at the configured bound', async () => {
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient();
        const reportingClient = createMockClient();
        mockedCreateClient
            .mockReturnValueOnce(defaultClient as never)
            .mockReturnValueOnce(analyticsClient as never)
            .mockReturnValueOnce(reportingClient as never);
        const service = new ClickHouseService({ maxDatabaseClients: 1 });

        await service.command('select 1', { database: 'analytics' });
        await service.command('select 1', { database: 'reporting' });

        expect(analyticsClient.close).toHaveBeenCalledTimes(1);
        expect(reportingClient.command).toHaveBeenCalledTimes(1);
        expect(service.getStats().databases).toEqual(['default', 'reporting']);
    });

    it('rejects pool growth while every override client is busy and recovers after release', async () => {
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient();
        const reportingClient = createMockClient();
        mockedCreateClient
            .mockReturnValueOnce(defaultClient as never)
            .mockReturnValueOnce(analyticsClient as never)
            .mockReturnValueOnce(reportingClient as never);
        const service = new ClickHouseService({ maxDatabaseClients: 1 });
        const gate = deferred<void>();
        const entered = deferred<void>();
        const held = service.withClient(
            async () => {
                entered.resolve();
                await gate.promise;
            },
            { database: 'analytics' },
        );
        await entered.promise;

        await expect(service.command('select 1', { database: 'reporting' })).rejects.toBeInstanceOf(
            ClickHouseClientPoolExhaustedError,
        );
        expect(mockedCreateClient).toHaveBeenCalledTimes(2);

        gate.resolve();
        await held;
        await service.command('select 1', { database: 'reporting' });
        expect(analyticsClient.close).toHaveBeenCalledTimes(1);
        expect(reportingClient.command).toHaveBeenCalledTimes(1);
    });

    it('keeps the pool closed to growth when an evicted client fails to close', async () => {
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient({
            close: jest.fn().mockRejectedValue(new Error('socket close failed')),
        });
        mockedCreateClient.mockReturnValueOnce(defaultClient as never).mockReturnValueOnce(analyticsClient as never);
        const service = new ClickHouseService({ maxDatabaseClients: 1 });
        await service.command('select 1', { database: 'analytics' });

        await expect(service.command('select 1', { database: 'reporting' })).rejects.toMatchObject({
            code: 'CLICKHOUSE_CLIENT_POOL_EXHAUSTED',
            cause: expect.objectContaining({ message: 'socket close failed' }),
        });
        await expect(service.command('select 1', { database: 'warehouse' })).rejects.toBeInstanceOf(
            ClickHouseClientPoolExhaustedError,
        );
        expect(mockedCreateClient).toHaveBeenCalledTimes(2);
    });

    it('allows pool recovery after a timed-out eviction eventually closes', async () => {
        const closeGate = deferred<void>();
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient({ close: jest.fn(() => closeGate.promise) });
        const reportingClient = createMockClient();
        mockedCreateClient
            .mockReturnValueOnce(defaultClient as never)
            .mockReturnValueOnce(analyticsClient as never)
            .mockReturnValueOnce(reportingClient as never);
        const service = new ClickHouseService({ maxDatabaseClients: 1, requestTimeoutMs: 10 });
        await service.command('select 1', { database: 'analytics' });

        await expect(service.command('select 1', { database: 'reporting' })).rejects.toMatchObject({
            code: 'CLICKHOUSE_CLIENT_POOL_EXHAUSTED',
        });
        closeGate.resolve();
        await closeGate.promise;
        await Promise.resolve();

        await service.command('select 1', { database: 'reporting' });
        expect(reportingClient.command).toHaveBeenCalledTimes(1);
    });

    it('releases a client lease when advanced SDK work fails', async () => {
        const analyticsClient = createMockClient();
        mockedCreateClient
            .mockImplementationOnce(() => createMockClient() as never)
            .mockReturnValueOnce(analyticsClient as never);
        const service = new ClickHouseService({ maxDatabaseClients: 1 });

        await expect(
            service.withClient(
                () => {
                    throw new Error('consumer failed');
                },
                { database: 'analytics' },
            ),
        ).rejects.toThrow('consumer failed');
        await expect(service.withClient(null as never)).rejects.toThrow('callback must be a function');
        expect(service.getStats().activeOperations).toBe(0);
    });

    it('routes null database overrides to the configured root database', async () => {
        const analyticsClient = createMockClient();
        const rootClient = createMockClient();
        mockedCreateClient.mockReturnValueOnce(analyticsClient as never).mockReturnValueOnce(rootClient as never);
        const service = new ClickHouseService({ database: 'analytics', rootDatabase: 'system' });

        await service.command('show databases', { database: null });

        expect(mockedCreateClient).toHaveBeenLastCalledWith(expect.objectContaining({ database: 'system' }));
        expect(rootClient.command).toHaveBeenCalledTimes(1);
    });

    it('returns structured authenticated health results and keeps ping compatible', async () => {
        const client = createMockClient();
        client.ping
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ success: false, error: new Error('not authorized') })
            .mockRejectedValueOnce(new Error('network down'));
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ database: 'analytics', pingTimeoutMs: 50 });

        await expect(service.healthCheck()).resolves.toMatchObject({
            healthy: true,
            database: 'analytics',
        });
        await expect(service.ping()).resolves.toBe(false);
        await expect(service.healthCheck()).resolves.toMatchObject({
            healthy: false,
            error: 'network down',
        });
        expect(client.ping).toHaveBeenCalledWith(
            expect.objectContaining({ select: true, abort_signal: expect.any(AbortSignal) }),
        );
    });

    it('turns invalid or closed health probes into unhealthy results', async () => {
        const service = new ClickHouseService({});

        await expect(service.healthCheck({ database: ' ' })).resolves.toMatchObject({ healthy: false });
        await service.close();
        await expect(service.healthCheck()).resolves.toMatchObject({
            healthy: false,
            error: expect.stringContaining('closing or already closed'),
        });
    });

    it('waits for active work, closes once, and rejects new work after shutdown starts', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ shutdownTimeoutMs: 250 });
        const gate = deferred<void>();
        const entered = deferred<void>();
        const operation = service.withClient(async () => {
            entered.resolve();
            await gate.promise;
        });
        await entered.promise;

        const closePromise = service.close();
        expect(service.close()).toBe(closePromise);
        expect(client.close).not.toHaveBeenCalled();
        await expect(service.command('select 1')).rejects.toBeInstanceOf(ClickHouseServiceClosedError);

        gate.resolve();
        await operation;
        await closePromise;
        expect(client.close).toHaveBeenCalledTimes(1);
        expect(service.getStats().closing).toBe(true);
    });

    it('tracks an operation before its asynchronous client acquisition yields', async () => {
        const client = createMockClient();
        const commandGate = deferred<void>();
        client.command.mockImplementationOnce(async () => {
            await commandGate.promise;
            return { query_id: 'command-id' };
        });
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ shutdownTimeoutMs: 250 });

        const operation = service.command('optimize table events');
        const closePromise = service.close();
        await Promise.resolve();
        expect(client.close).not.toHaveBeenCalled();

        commandGate.resolve();
        await operation;
        await closePromise;
        expect(client.command).toHaveBeenCalledTimes(1);
        expect(client.close).toHaveBeenCalledTimes(1);
    });

    it('attempts every client close and preserves all shutdown failures', async () => {
        const defaultClient = createMockClient({
            close: jest.fn().mockRejectedValue(new Error('default close failed')),
        });
        const analyticsClient = createMockClient({
            close: jest.fn().mockRejectedValue(new Error('analytics close failed')),
        });
        mockedCreateClient.mockReturnValueOnce(defaultClient as never).mockReturnValueOnce(analyticsClient as never);
        const service = new ClickHouseService({});
        await service.command('select 1', { database: 'analytics' });

        await expect(service.close()).rejects.toMatchObject({
            code: 'CLICKHOUSE_SHUTDOWN_ERROR',
            errors: expect.arrayContaining([expect.any(Error), expect.any(Error)]),
        });
        expect(defaultClient.close).toHaveBeenCalledTimes(1);
        expect(analyticsClient.close).toHaveBeenCalledTimes(1);
        expect(ClickHouseShutdownError).toBeInstanceOf(Function);
    });

    it('bounds shutdown even when the first-party client close never settles', async () => {
        const client = createMockClient({ close: jest.fn(() => new Promise<void>(() => undefined)) });
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ shutdownTimeoutMs: 10 });
        const startedAt = Date.now();

        await expect(service.close()).rejects.toMatchObject({ code: 'CLICKHOUSE_SHUTDOWN_ERROR' });
        expect(Date.now() - startedAt).toBeLessThan(250);
        expect(client.close).toHaveBeenCalledTimes(1);
    });

    it('bounds waiting for active operations and exposes the Nest destroy hook', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ shutdownTimeoutMs: 10 });
        const gate = deferred<void>();
        const operation = service.withClient(() => gate.promise);

        await expect(service.onModuleDestroy()).rejects.toMatchObject({ code: 'CLICKHOUSE_SHUTDOWN_ERROR' });
        expect(client.close).toHaveBeenCalledTimes(1);
        gate.resolve();
        await operation;
    });
});

function createMockClient(overrides: Record<string, unknown> = {}) {
    return {
        command: jest.fn().mockResolvedValue({ query_id: 'command-id' }),
        query: jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue({ data: [{ id: 1 }] }),
            text: jest.fn().mockResolvedValue('query-result'),
            close: jest.fn(),
        }),
        insert: jest.fn().mockResolvedValue({ executed: true, query_id: 'insert-id' }),
        ping: jest.fn().mockResolvedValue({ success: true }),
        close: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
