import type { LogEvent } from 'kysely';
import {
    configureExternalCallCollector,
    configureSqlQueryCollector,
    externalCallCollectorStorage,
    getExternalCallCollectorOptions,
    getRecordedExternalCalls,
    getRecordedExternalCallsOrEmpty,
    getRecordedSqls,
    getRecordedSqlsOrEmpty,
    getSqlQueryCollectorOptions,
    normalizeSqlPattern,
    recordExternalCall,
    recordSql,
    sqlQueryCollectorStorage,
    summarizeSqlPatterns,
    traceExternalCall,
} from '../index';

describe('bounded observability collectors', () => {
    beforeEach(() => {
        configureExternalCallCollector({
            maxEntriesPerRequest: 200,
            maxTargetLength: 256,
            maxOpLength: 64,
            maxErrorLength: 200,
        });
        configureSqlQueryCollector({ maxQueriesPerRequest: 100, maxSqlLengthBytes: 2048 });
    });

    it('validates and snapshots external-call configuration', () => {
        configureExternalCallCollector({ maxEntriesPerRequest: 3, captureErrorDetails: true });
        const options = getExternalCallCollectorOptions();
        expect(options).toMatchObject({ maxEntriesPerRequest: 3, captureErrorDetails: true });
        (options as { maxEntriesPerRequest: number }).maxEntriesPerRequest = 99;
        expect(getExternalCallCollectorOptions().maxEntriesPerRequest).toBe(3);

        expect(() => configureExternalCallCollector(null as never)).toThrow(TypeError);
        expect(() => configureExternalCallCollector({ maxEntriesPerRequest: 0 })).toThrow(RangeError);
        expect(() => configureExternalCallCollector({ maxTargetLength: 5000 })).toThrow(RangeError);
        expect(() => configureExternalCallCollector({ captureErrorDetails: 'yes' as never })).toThrow(TypeError);
    });

    it('bounds, normalizes, and defensively snapshots external calls', () => {
        configureExternalCallCollector({
            maxEntriesPerRequest: 1,
            maxTargetLength: 4,
            maxOpLength: 4,
            maxErrorLength: 16,
        });

        externalCallCollectorStorage.run([], () => {
            expect(() => recordExternalCall(null as never)).not.toThrow();
            recordExternalCall({
                kind: 'invalid' as never,
                target: 'target\nsecret',
                op: '',
                durationMs: Number.NaN,
                error: new Error('credential leaked'),
            });
            recordExternalCall({ kind: 'http', target: 'ignored', op: 'GET', durationMs: 1 });

            const snapshot = getRecordedExternalCallsOrEmpty();
            expect(snapshot).toEqual([
                expect.objectContaining({
                    kind: 'custom',
                    target: 't...',
                    op: '_...',
                    durationMs: 0,
                    error: 'Error',
                }),
            ]);
            snapshot[0].target = 'mutated';
            expect(getRecordedExternalCallsOrEmpty()[0].target).toBe('t...');
        });
    });

    it('keeps error details private by default and supports bounded opt-in details', () => {
        externalCallCollectorStorage.run([], () => {
            recordExternalCall({ kind: 'redis', target: 'cache', op: 'get', durationMs: 1, error: 'token=secret' });
            expect(getRecordedExternalCallsOrEmpty()[0].error).toBe('Error');
        });

        configureExternalCallCollector({ captureErrorDetails: true, maxErrorLength: 16 });
        externalCallCollectorStorage.run([], () => {
            recordExternalCall({
                kind: 'redis',
                target: 'cache',
                op: 'get',
                durationMs: 1,
                error: new Error('connection\nrefused and more'),
            });
            expect(getRecordedExternalCallsOrEmpty()[0].error).toBe('connection re...');
        });

        configureExternalCallCollector({
            captureErrorDetails: true,
            maxTargetLength: 2,
            maxOpLength: 2,
            maxErrorLength: 16,
        });
        externalCallCollectorStorage.run([], () => {
            const namelessError = new Error();
            namelessError.name = '';
            namelessError.message = '';
            recordExternalCall({
                kind: 'custom',
                target: null as never,
                op: null as never,
                durationMs: -1,
                error: namelessError,
            });
            recordExternalCall({
                kind: 'custom',
                target: 'target',
                op: 'op',
                durationMs: 1,
                error: { private: true },
            });
            expect(getRecordedExternalCallsOrEmpty()[0]).toMatchObject({
                target: '..',
                op: '..',
                durationMs: 0,
                error: 'Error',
            });
            expect(getRecordedExternalCallsOrEmpty()[1].error).toBe('Error');
        });
    });

    it('traces success and failure without wall-clock duration regressions', async () => {
        await externalCallCollectorStorage.run([], async () => {
            await expect(
                traceExternalCall({ kind: 'http', target: 'upstream', op: 'GET /' }, async () => 'ok'),
            ).resolves.toBe('ok');
            await expect(
                traceExternalCall({ kind: 'queue', target: 'events', op: 'publish' }, async () => {
                    throw new Error('down');
                }),
            ).rejects.toThrow('down');
            expect(getRecordedExternalCallsOrEmpty()).toEqual([
                expect.objectContaining({ durationMs: expect.any(Number) }),
                expect.objectContaining({ durationMs: expect.any(Number), error: 'Error' }),
            ]);
            expect(getRecordedExternalCallsOrEmpty().every(entry => entry.durationMs >= 0)).toBe(true);
        });
        await expect(traceExternalCall({ kind: 'http', target: 'x', op: 'y' }, null as never)).rejects.toThrow(
            TypeError,
        );
    });

    it('returns explicit empty collector state outside a request', () => {
        expect(getRecordedExternalCalls()).toBeNull();
        expect(getRecordedExternalCallsOrEmpty()).toEqual([]);
        expect(getRecordedSqls()).toBeNull();
        expect(getRecordedSqlsOrEmpty()).toEqual([]);
        expect(() =>
            recordExternalCall({ kind: 'http', target: 'ignored', op: 'ignored', durationMs: 1 }),
        ).not.toThrow();
        expect(() => recordSql(queryEvent('select 1'))).not.toThrow();
    });

    it('validates and snapshots SQL collector configuration', () => {
        configureSqlQueryCollector({ captureParameters: true, maxParametersPerQuery: 2 });
        const options = getSqlQueryCollectorOptions();
        expect(options).toMatchObject({ captureParameters: true, maxParametersPerQuery: 2 });
        (options as { maxParametersPerQuery: number }).maxParametersPerQuery = 99;
        expect(getSqlQueryCollectorOptions().maxParametersPerQuery).toBe(2);

        expect(() => configureSqlQueryCollector(null as never)).toThrow(TypeError);
        expect(() => configureSqlQueryCollector({ maxQueriesPerRequest: 0 })).toThrow(RangeError);
        expect(() => configureSqlQueryCollector({ maxSqlLengthBytes: 15 })).toThrow(RangeError);
        expect(() => configureSqlQueryCollector({ maxParameterDepth: 33 })).toThrow(RangeError);
        expect(() => configureSqlQueryCollector({ captureRawSql: 'yes' as never })).toThrow(TypeError);
        expect(() => configureSqlQueryCollector({ captureParameters: 'yes' as never })).toThrow(TypeError);
        expect(() => configureSqlQueryCollector({ captureErrorDetails: 'yes' as never })).toThrow(TypeError);
    });

    it('disables SQL parameter and error detail capture by default', () => {
        sqlQueryCollectorStorage.run([], () => {
            recordSql(
                errorEvent(
                    "select * from users where password = 'super-secret' and id = $1",
                    ['super-secret'],
                    new Error('db secret'),
                ),
            );
            expect(getRecordedSqlsOrEmpty()).toEqual([
                expect.objectContaining({
                    sql: "select * from users where password = '?' and id = $?",
                    parameters: [],
                    error: 'Error',
                    durationMs: 2,
                }),
            ]);
        });
    });

    it('captures raw SQL only through an explicit bounded opt-in', () => {
        configureSqlQueryCollector({ captureRawSql: true, maxSqlLengthBytes: 64 });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(queryEvent("select * from users where token = 'visible-by-opt-in'"));
            expect(getRecordedSqlsOrEmpty()[0].sql).toBe("select * from users where token = 'visible-by-opt-in'");
        });
    });

    it('captures bounded parameters with secret redaction and no accessor execution', () => {
        configureSqlQueryCollector({
            captureParameters: true,
            captureErrorDetails: true,
            maxParametersPerQuery: 3,
            maxParameterEntries: 20,
            maxParameterLengthBytes: 32,
            maxErrorLength: 32,
        });
        const getter = jest.fn(() => 'must not run');
        const value: Record<string, unknown> = { password: 'secret', safe: 'visible' };
        Object.defineProperty(value, 'computed', { enumerable: true, get: getter });
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;

        sqlQueryCollectorStorage.run([], () => {
            recordSql(
                errorEvent(
                    'select $1',
                    [value, cyclic, new Uint8Array(4), 'omitted'],
                    new Error('connection\ncontains detail'),
                ),
            );
            const entry = getRecordedSqlsOrEmpty()[0];
            expect(entry.parameters).toEqual([
                { password: '[REDACTED]', safe: 'visible', computed: '<accessor omitted>' },
                { self: '<circular or repeated>' },
                '<binary 4B>',
                '<1 parameters omitted>',
            ]);
            expect(entry.error).toBe('connection contains detail');
            expect(getter).not.toHaveBeenCalled();

            (entry.parameters[0] as Record<string, unknown>).safe = 'mutated';
            expect((getRecordedSqlsOrEmpty()[0].parameters[0] as Record<string, unknown>).safe).toBe('visible');
        });
    });

    it('serializes supported parameter types without executing application code', () => {
        configureSqlQueryCollector({
            captureParameters: true,
            maxParametersPerQuery: 20,
            maxParameterEntries: 100,
            maxParameterLengthBytes: 16,
        });
        const invalidDate = new Date(Number.NaN);
        sqlQueryCollectorStorage.run([], () => {
            recordSql(
                queryEvent('select values', [
                    null,
                    undefined,
                    'x'.repeat(30),
                    42,
                    Number.POSITIVE_INFINITY,
                    true,
                    42n,
                    Symbol('hidden'),
                    () => 'hidden',
                    new Date('2024-01-01T00:00:00.000Z'),
                    invalidDate,
                    new TypeError('private'),
                ]),
            );
            expect(getRecordedSqlsOrEmpty()[0].parameters).toEqual([
                null,
                null,
                'xx...[truncated]',
                42,
                '<non-finite number>',
                true,
                '42',
                '<unsupported symbol>',
                '<unsupported function>',
                '2024-01-01T00:00:00.000Z',
                '<invalid date>',
                'TypeError',
            ]);
        });
    });

    it('bounds nested parameter depth and entries and contains hostile proxies', () => {
        configureSqlQueryCollector({
            captureParameters: true,
            maxParameterDepth: 1,
            maxParameterEntries: 1,
        });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(queryEvent('select array', [[1, 2]]));
            expect(getRecordedSqlsOrEmpty()[0].parameters).toEqual([[1, '<entry limit>']]);
        });

        configureSqlQueryCollector({
            captureParameters: true,
            maxParameterDepth: 1,
            maxParameterEntries: 1,
        });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(queryEvent('select object', [{ first: 1, second: 2 }]));
            expect(getRecordedSqlsOrEmpty()[0].parameters).toEqual([{ first: 1, __truncated__: '<entry limit>' }]);
        });

        configureSqlQueryCollector({ captureParameters: true, maxParameterDepth: 0 });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(queryEvent('select deep', [{ nested: true }]));
            expect(getRecordedSqlsOrEmpty()[0].parameters).toEqual(['<max depth>']);
        });

        const hostile = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error('hostile proxy');
                },
            },
        );
        configureSqlQueryCollector({ captureParameters: true });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(queryEvent('select hostile', [hostile]));
            expect(getRecordedSqlsOrEmpty()[0].parameters).toEqual(['<uninspectable object>']);
        });
    });

    it('uses UTF-8 byte limits, query caps, and nonnegative finite durations', () => {
        configureSqlQueryCollector({ maxQueriesPerRequest: 1, maxSqlLengthBytes: 16 });
        sqlQueryCollectorStorage.run([], () => {
            recordSql({ ...queryEvent('😀'.repeat(20)), queryDurationMillis: -4 } as LogEvent);
            recordSql(queryEvent('ignored'));
            const entries = getRecordedSqlsOrEmpty();
            expect(entries).toHaveLength(1);
            expect(Buffer.byteLength(entries[0].sql, 'utf8')).toBeLessThanOrEqual(16);
            expect(entries[0]).toMatchObject({ durationMs: 0, truncated: true });
        });
        sqlQueryCollectorStorage.run([], () => {
            expect(() => recordSql({ level: 'query', query: null } as never)).not.toThrow();
            expect(getRecordedSqlsOrEmpty()).toHaveLength(1);
        });
    });

    it('contains collector-store mutations and handles non-Error detail values', () => {
        configureExternalCallCollector({ captureErrorDetails: true });
        expect(() =>
            externalCallCollectorStorage.run(Object.freeze([]) as never, () =>
                recordExternalCall({ kind: 'http', target: 'api', op: 'GET', durationMs: 1 }),
            ),
        ).not.toThrow();

        configureSqlQueryCollector({ captureErrorDetails: true });
        sqlQueryCollectorStorage.run([], () => {
            recordSql(errorEvent('select 1', [], 'plain failure'));
            recordSql(errorEvent('select 2', [], { hidden: true }));
            expect(getRecordedSqlsOrEmpty().map(entry => entry.error)).toEqual(['plain failure', 'Error']);
        });
    });

    it('normalizes SQL without retaining comments or literal values', () => {
        expect(
            normalizeSqlPattern("select * from users -- token=secret\n where id = 42 and name = 'Ana' and tenant = $1"),
        ).toBe("select * from users where id = ? and name = '?' and tenant = $?");
        expect(normalizeSqlPattern('select * from jobs where id IN ($1, $2, $3) /* private */')).toBe(
            'select * from jobs where id IN ($?)',
        );
        expect(normalizeSqlPattern('select $$token=secret$$, $tag$private$tag$, 1+2')).toBe("select '?', '?', ?+?");
        expect(normalizeSqlPattern("select 'it\\'s private', 'it''s hidden', 0xFF, 1.2e-3")).toBe(
            "select '?', '?', ?, ?",
        );
        expect(normalizeSqlPattern('select $not_a_delimiter + 1')).toBe('select $not_a_delimiter + ?');
        expect(() => normalizeSqlPattern(null as never)).toThrow(TypeError);
    });

    it('summarizes patterns deterministically and validates the threshold', () => {
        const summary = summarizeSqlPatterns(
            [
                { sql: 'select 2', parameters: [], durationMs: 2, timestamp: 1 },
                { sql: 'select 1', parameters: [], durationMs: 1, timestamp: 2 },
                { sql: 'update x set y = 1', parameters: [], durationMs: Number.NaN, timestamp: 3 },
            ],
            2,
        );
        expect(summary[0]).toMatchObject({ pattern: 'select ?', count: 2, totalMs: 3, nPlusOneSuspect: true });
        expect(summary[1]).toMatchObject({ count: 1, totalMs: 0, nPlusOneSuspect: false });
        expect(() => summarizeSqlPatterns([], 0)).toThrow(RangeError);
        expect(() => summarizeSqlPatterns(null as never)).toThrow(TypeError);
    });

    it('caps accumulated SQL summary durations at a finite value', () => {
        const summary = summarizeSqlPatterns([
            { sql: 'select 1', parameters: [], durationMs: Number.MAX_VALUE, timestamp: 1 },
            { sql: 'select 2', parameters: [], durationMs: Number.MAX_VALUE, timestamp: 2 },
            null as never,
        ]);
        expect(summary.find(entry => entry.pattern === 'select ?')).toMatchObject({
            count: 2,
            totalMs: Number.MAX_VALUE,
        });
        expect(summary.find(entry => entry.pattern === '__invalid_sql__')).toMatchObject({ count: 1, totalMs: 0 });
    });
});

function queryEvent(sql: string, parameters: unknown[] = []): LogEvent {
    return {
        level: 'query',
        query: { sql, parameters },
        queryDurationMillis: 2,
    } as unknown as LogEvent;
}

function errorEvent(sql: string, parameters: unknown[], error: unknown): LogEvent {
    return {
        level: 'error',
        query: { sql, parameters },
        queryDurationMillis: 2,
        error,
    } as unknown as LogEvent;
}
