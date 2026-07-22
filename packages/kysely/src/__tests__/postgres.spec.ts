import { PostgresDialect } from 'kysely';
import { KyselyConfigurationError } from '../kysely-module-options.interface';
import { createPostgresKyselyConfig, createPostgresKyselyModuleOptions, createPostgresPoolConfig } from '../postgres';

describe('PostgreSQL option builders', () => {
    it('creates a new pool config without mutating the caller input', () => {
        const pool = { application_name: 'api', host: 'fallback', port: 5432, min: 2 };

        expect(
            createPostgresPoolConfig({
                host: 'db',
                port: '5433',
                user: 'app',
                password: 'password',
                database: 'orders',
                max: '+12',
                pool,
            }),
        ).toEqual({
            application_name: 'api',
            host: 'db',
            port: 5433,
            min: 2,
            user: 'app',
            password: 'password',
            database: 'orders',
            max: 12,
        });
        expect(pool).toEqual({ application_name: 'api', host: 'fallback', port: 5432, min: 2 });
    });

    it('uses valid pool values when top-level overrides are empty', () => {
        expect(
            createPostgresPoolConfig({
                host: '',
                port: '',
                max: '',
                pool: { host: 'pool-db', port: 6543, max: 20, min: 0 },
            }),
        ).toEqual({ host: 'pool-db', port: 6543, max: 20, min: 0 });
    });

    it('creates Kysely and module configs with explicit log precedence', () => {
        const log = ['error'] as const;
        const config = createPostgresKyselyConfig({ host: 'db', log, logger: { consoleOutput: false } });
        const withLogger = createPostgresKyselyModuleOptions({ logger: { consoleOutput: false } });

        expect(config.dialect).toBeInstanceOf(PostgresDialect);
        expect(config.log).toBe(log);
        expect(withLogger.config.dialect).toBeInstanceOf(PostgresDialect);
        expect(withLogger.config.log).toEqual(expect.any(Function));
        expect(createPostgresKyselyConfig().log).toBeUndefined();
    });

    it.each([
        ['null options', null],
        ['array options', []],
        ['array pool', { pool: [] }],
        ['non-string host', { host: 42 }],
        ['non-string user', { user: false }],
        ['non-string password', { password: 42 }],
        ['non-string database', { database: {} }],
        ['zero port', { port: 0 }],
        ['large port', { port: 65_536 }],
        ['fractional port', { port: 5432.5 }],
        ['exponent port', { port: '5e3' }],
        ['whitespace port', { port: ' ' }],
        ['zero max', { max: 0 }],
        ['fractional max', { max: '1.5' }],
        ['unsafe max', { max: Number.MAX_SAFE_INTEGER + 1 }],
        ['invalid pool port', { pool: { port: -1 } }],
        ['invalid pool max', { pool: { max: 0 } }],
        ['invalid pool min', { pool: { min: -1 } }],
        ['pool min above max', { pool: { min: 5, max: 4 } }],
    ])('rejects %s', (_name, options) => {
        expect(() => createPostgresPoolConfig(options as never)).toThrow(KyselyConfigurationError);
    });
});
