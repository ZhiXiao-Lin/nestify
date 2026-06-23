import { createClient } from '@clickhouse/client';
import { CLICKHOUSE_OPTIONS_TOKEN, ClickHouseModule, ClickHouseService } from '../index';

jest.mock('@clickhouse/client', () => ({
    createClient: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('clickhouse service', () => {
    beforeEach(() => {
        mockedCreateClient.mockReset();
        mockedCreateClient.mockImplementation(() => createMockClient() as never);
    });

    it('normalizes client options and registers Nest providers', () => {
        const module = ClickHouseModule.register({
            url: 'http://clickhouse:8123///',
            username: 'default',
            password: 'secret',
            database: 'analytics',
            application: 'api',
        });

        expect(module.providers).toEqual([
            {
                provide: CLICKHOUSE_OPTIONS_TOKEN,
                useValue: {
                    url: 'http://clickhouse:8123///',
                    username: 'default',
                    password: 'secret',
                    database: 'analytics',
                    application: 'api',
                },
            },
            ClickHouseService,
        ]);

        new ClickHouseService({
            url: 'http://clickhouse:8123///',
            username: 'default',
            password: 'secret',
            database: 'analytics',
            application: 'api',
        });

        expect(mockedCreateClient).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'http://clickhouse:8123',
                username: 'default',
                password: 'secret',
                database: 'analytics',
                request_timeout: 10000,
                application: 'api',
            }),
        );
    });

    it('routes execute calls to query or command based on SQL kind', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ url: 'http://clickhouse:8123' });

        await expect(service.execute('select 1 FORMAT JSON')).resolves.toBe('query-result');
        await expect(service.execute('create table events (id UInt64)')).resolves.toBe('');

        expect(client.query).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'select 1',
                format: 'JSON',
            }),
        );
        expect(client.command).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'create table events (id UInt64)',
            }),
        );
    });

    it('skips empty inserts and sends JSONEachRow for non-empty rows', async () => {
        const client = createMockClient();
        mockedCreateClient.mockReturnValue(client as never);
        const service = new ClickHouseService({ url: 'http://clickhouse:8123' });

        await service.insertJsonEachRow('events', []);
        await service.insertJsonEachRow('events', [{ id: 1, name: 'created' }]);

        expect(client.insert).toHaveBeenCalledTimes(1);
        expect(client.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                table: 'events',
                values: [{ id: 1, name: 'created' }],
                format: 'JSONEachRow',
            }),
        );
    });

    it('creates and reuses clients for explicit database overrides', async () => {
        const defaultClient = createMockClient();
        const analyticsClient = createMockClient();
        mockedCreateClient.mockReturnValueOnce(defaultClient as never).mockReturnValueOnce(analyticsClient as never);
        const service = new ClickHouseService({ url: 'http://clickhouse:8123', database: 'default' });

        await service.command('optimize table events', { database: 'analytics' });
        await service.command('optimize table visits', { database: 'analytics' });

        expect(mockedCreateClient).toHaveBeenCalledTimes(2);
        expect(mockedCreateClient).toHaveBeenLastCalledWith(expect.objectContaining({ database: 'analytics' }));
        expect(analyticsClient.command).toHaveBeenCalledTimes(2);
    });

    it('closes all created clients on module destroy', async () => {
        const defaultClient = createMockClient();
        const rootClient = createMockClient();
        mockedCreateClient.mockReturnValueOnce(defaultClient as never).mockReturnValueOnce(rootClient as never);
        const service = new ClickHouseService({ url: 'http://clickhouse:8123', database: 'default' });

        await service.command('create database analytics', { database: null });
        await service.onModuleDestroy();

        expect(defaultClient.close).toHaveBeenCalledTimes(1);
        expect(rootClient.close).toHaveBeenCalledTimes(1);
    });
});

function createMockClient() {
    return {
        command: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue({ data: [{ id: 1 }] }),
            text: jest.fn().mockResolvedValue('query-result'),
        }),
        insert: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue({ success: true }),
        close: jest.fn().mockResolvedValue(undefined),
    };
}
