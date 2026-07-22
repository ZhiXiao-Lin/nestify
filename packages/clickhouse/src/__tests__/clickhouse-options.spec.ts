import { ClickHouseConfigurationError, createClickHouseClientOptions } from '../index';

describe('ClickHouse connection options', () => {
    it('provides secure, bounded defaults without mutating the input', () => {
        const input = {
            clientOptions: {
                compression: { response: true },
            },
        };

        const result = createClickHouseClientOptions(input);

        expect(result).toMatchObject({
            url: 'http://localhost:8123',
            database: 'default',
            request_timeout: 10_000,
            application: '@a3s-lab/clickhouse',
            compression: { response: true },
        });
        expect(input).toEqual({ clientOptions: { compression: { response: true } } });
        expect(result).not.toBe(input.clientOptions);
    });

    it('maps convenience options over advanced first-party client options', () => {
        const result = createClickHouseClientOptions({
            url: new URL('https://clickhouse.example.test///'),
            database: ' analytics ',
            accessToken: 'cloud-token',
            requestTimeoutMs: 4_000,
            maxOpenConnections: 8,
            application: 'reporting-api',
            pathname: '/proxy/clickhouse',
            keepAlive: { enabled: true, idle_socket_ttl: 1_500 },
            httpHeaders: { ' x-request-source ': 'nestify' },
            role: ['reader', ' analyst '],
            useMultipartParamsAuto: true,
            clientOptions: {
                url: 'http://ignored:8123',
                database: 'ignored',
                request_timeout: 1,
                max_open_connections: 2,
                capture_enhanced_stack_trace: true,
            },
        });

        expect(result).toMatchObject({
            url: 'https://clickhouse.example.test',
            database: 'analytics',
            access_token: 'cloud-token',
            request_timeout: 4_000,
            max_open_connections: 8,
            application: 'reporting-api',
            pathname: '/proxy/clickhouse',
            keep_alive: { enabled: true, idle_socket_ttl: 1_500 },
            http_headers: { 'x-request-source': 'nestify' },
            role: ['reader', 'analyst'],
            use_multipart_params_auto: true,
            capture_enhanced_stack_trace: true,
        });
    });

    it('normalizes deprecated host input into url and preserves proxy paths', () => {
        expect(
            createClickHouseClientOptions({
                clientOptions: { host: 'https://proxy.example.test/clickhouse/' },
            }),
        ).toMatchObject({
            url: 'https://proxy.example.test/clickhouse/',
        });
    });

    it('supports basic authentication including an empty password', () => {
        expect(
            createClickHouseClientOptions({
                username: 'default',
                password: '',
            }),
        ).toMatchObject({ username: 'default', password: '' });
    });

    it.each([
        { accessToken: 'token', username: 'default' },
        { accessToken: 'token', password: 'secret' },
        { accessToken: 'token', url: 'https://user:secret@clickhouse.example.test' },
    ])('rejects conflicting authentication %#', options => {
        expect(() => createClickHouseClientOptions(options)).toThrow(
            'accessToken cannot be combined with username/password',
        );
    });

    it.each([
        'ftp://clickhouse.example.test',
        'not a url',
        'https://clickhouse.example.test/#fragment',
    ])('rejects invalid endpoint %s', url => {
        expect(() => createClickHouseClientOptions({ url })).toThrow(ClickHouseConfigurationError);
    });

    it.each([
        ['requestTimeoutMs', 0],
        ['requestTimeoutMs', 1.5],
        ['pingTimeoutMs', -1],
        ['shutdownTimeoutMs', Number.POSITIVE_INFINITY],
        ['maxOpenConnections', 0],
        ['maxDatabaseClients', -1],
    ] as const)('rejects invalid numeric option %s=%s', (name, value) => {
        expect(() => createClickHouseClientOptions({ [name]: value })).toThrow(ClickHouseConfigurationError);
    });

    it.each([
        { database: '   ' },
        { rootDatabase: '' },
        { application: '' },
        { username: '' },
        { accessToken: '' },
        { role: [] },
        { role: ['reader', ''] },
        { httpHeaders: { 'bad\nname': 'value' } },
        { httpHeaders: { good: 'bad\rvalue' } },
        { clientOptions: [] as never },
    ])('rejects malformed structured options %#', options => {
        expect(() => createClickHouseClientOptions(options)).toThrow(ClickHouseConfigurationError);
    });

    it('rejects host and url when both are supplied', () => {
        expect(() =>
            createClickHouseClientOptions({
                url: 'http://clickhouse:8123',
                clientOptions: { host: 'http://legacy:8123' },
            }),
        ).toThrow('clientOptions.host cannot be combined with url');
    });
});
