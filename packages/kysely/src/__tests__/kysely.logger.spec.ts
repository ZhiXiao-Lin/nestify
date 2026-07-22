import type { LogEvent } from 'kysely';
import {
    createKyselyLogger,
    DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_COUNT,
    DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_LENGTH,
    DEFAULT_KYSELY_LOGGER_MAX_SQL_LENGTH,
} from '../kysely.logger';
import { KyselyConfigurationError } from '../kysely-module-options.interface';

describe('Kysely logger', () => {
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();

    beforeEach(() => {
        log.mockClear();
        error.mockClear();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('logs bounded single-line SQL without exposing parameters by default', () => {
        const onQuery = jest.fn();
        const event = queryEvent('SELECT *\nFROM users WHERE password = $1', ['top-secret']);

        createKyselyLogger({ onQuery, maxSqlLength: 24 })(event);

        const output = loggedText(log);
        expect(onQuery).toHaveBeenCalledWith(event);
        expect(output).toContain('[KYSELY QUERY]');
        expect(output).toContain('SELECT * FROM users WHE…');
        expect(output).not.toContain('top-secret');
        expect(output).not.toContain('\n');
    });

    it('supports explicitly bounded parameter logging for difficult values', () => {
        const circular: Record<string, unknown> = { name: 'circular' };
        circular.self = circular;
        const throwing = Object.create(null, {
            value: {
                enumerable: true,
                get: () => {
                    throw new Error('getter failed');
                },
            },
        });
        const logger = createKyselyLogger({
            logParameters: true,
            maxParameterCount: 5,
            maxParameterLength: 18,
        });

        expect(() =>
            logger(
                queryEvent('insert into values_table values ($1, $2, $3, $4, $5, $6)', [
                    'line\nbreak-and-a-long-tail',
                    12n,
                    circular,
                    throwing,
                    new Date('invalid'),
                    Symbol('hidden'),
                ]),
            ),
        ).not.toThrow();

        const output = loggedText(log);
        expect(output).toContain('line break-and-a-…');
        expect(output).toContain('12n');
        expect(output).toContain('circular');
        expect(output).toContain('[Unserializable v…');
        expect(output).toContain('[Invalid Date]');
        expect(output).toContain('[1 more parameter omitted]');
    });

    it('formats primitive, date, symbol, function, and nested bigint parameters safely', () => {
        const anonymous = () => undefined;
        Object.defineProperty(anonymous, 'name', { value: '' });
        const logger = createKyselyLogger({ logParameters: true, maxParameterLength: 128 });

        logger(
            queryEvent('select parameters', [
                null,
                undefined,
                42,
                Number.POSITIVE_INFINITY,
                true,
                new Date('2026-07-22T00:00:00.000Z'),
                Symbol('value'),
                function named() {
                    return undefined;
                },
                anonymous,
                { nested: 3n },
                { toJSON: () => undefined },
            ]),
        );

        const output = loggedText(log);
        expect(output).toContain('NULL');
        expect(output).toContain('42');
        expect(output).toContain('[Infinity]');
        expect(output).toContain('true');
        expect(output).toContain('2026-07-22T00:00:00.000Z');
        expect(output).toContain('Symbol(value)');
        expect(output).toContain('[Function named]');
        expect(output).toContain('[Function]');
        expect(output).toContain('{"nested":"3n"}');
        expect(output).toContain('[Unserializable value]');
    });

    it('can omit every parameter with a bounded plural summary', () => {
        createKyselyLogger({ logParameters: true, maxParameterCount: 0 })(queryEvent('select $1, $2', [1, 2]));
        expect(loggedText(log)).toContain('[2 more parameters omitted]');
    });

    it('redacts error parameters and stacks unless explicitly enabled', () => {
        const failure = new Error('bad\nquery');
        const event = errorEvent('SELECT secret FROM credentials WHERE token = $1', ['top-secret-token'], failure);

        createKyselyLogger()(event);
        let output = loggedText(error);
        expect(output).toContain('[KYSELY ERROR]');
        expect(output).toContain('bad query');
        expect(output).not.toContain('top-secret-token');
        expect(output).not.toContain('kysely.logger.spec');

        error.mockClear();
        createKyselyLogger({ logParameters: true, logErrorStack: true })(event);
        output = loggedText(error);
        expect(output).toContain('top-secret-token');
        expect(output).toContain('Stack:');

        error.mockClear();
        createKyselyLogger()(errorEvent('select 1', [], 'plain failure'));
        expect(loggedText(error)).toContain('plain failure');
    });

    it('contains hook and formatting failures without throwing into query execution', () => {
        const hookError = new Error('hook\nfailed');
        const logger = createKyselyLogger({
            onQuery: () => {
                throw hookError;
            },
        });

        expect(() => logger(queryEvent('select 1', []))).not.toThrow();
        expect(error).toHaveBeenCalledWith('[KYSELY LOGGER HOOK ERROR]', 'hook failed');
        expect(loggedText(log)).toContain('[KYSELY QUERY]');

        const brokenEvent = {
            level: 'query',
            queryDurationMillis: 1,
            query: Object.create(null, {
                sql: {
                    get: () => {
                        throw new Error('sql getter failed');
                    },
                },
            }),
        } as LogEvent;
        expect(() => createKyselyLogger()(brokenEvent)).not.toThrow();
        expect(error).toHaveBeenCalledWith('[KYSELY LOGGER ERROR]', 'sql getter failed');
    });

    it('can disable console output while preserving the event hook', () => {
        const onQuery = jest.fn();
        createKyselyLogger({ consoleOutput: false, onQuery })(queryEvent('select 1', []));

        expect(onQuery).toHaveBeenCalledTimes(1);
        expect(log).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
    });

    it.each([
        [0.5, '0.50ms'],
        [5, '5.00ms'],
        [100, '100.00ms'],
        [-1, 'unknown'],
        [Number.NaN, 'unknown'],
    ])('formats duration %s safely', (duration, expected) => {
        createKyselyLogger()(queryEvent('select 1', [], duration));
        expect(loggedText(log)).toContain(expected);
    });

    it.each([
        ['null options', null],
        ['array options', []],
        ['invalid consoleOutput', { consoleOutput: 'yes' }],
        ['invalid logParameters', { logParameters: 'yes' }],
        ['invalid logErrorStack', { logErrorStack: 'yes' }],
        ['invalid hook', { onQuery: true }],
        ['zero SQL length', { maxSqlLength: 0 }],
        ['large SQL length', { maxSqlLength: 1_000_001 }],
        ['negative parameter count', { maxParameterCount: -1 }],
        ['large parameter count', { maxParameterCount: 1_001 }],
        ['zero parameter length', { maxParameterLength: 0 }],
        ['fractional parameter length', { maxParameterLength: 1.5 }],
    ])('rejects %s', (_name, options) => {
        expect(() => createKyselyLogger(options as never)).toThrow(KyselyConfigurationError);
    });

    it('exports stable safety defaults', () => {
        expect(DEFAULT_KYSELY_LOGGER_MAX_SQL_LENGTH).toBe(10_000);
        expect(DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_COUNT).toBe(20);
        expect(DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_LENGTH).toBe(256);
    });
});

function queryEvent(sql: string, parameters: readonly unknown[], duration = 5): LogEvent {
    return {
        level: 'query',
        queryDurationMillis: duration,
        query: { sql, parameters },
    } as unknown as LogEvent;
}

function errorEvent(sql: string, parameters: readonly unknown[], failure: unknown): LogEvent {
    return {
        level: 'error',
        queryDurationMillis: 10,
        query: { sql, parameters },
        error: failure,
    } as unknown as LogEvent;
}

function loggedText(spy: jest.SpyInstance): string {
    return spy.mock.calls
        .flat()
        .map(String)
        .join(' ')
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
}
