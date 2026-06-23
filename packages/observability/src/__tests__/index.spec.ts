import type { LogEvent } from 'kysely';
import {
    MetricsService,
    configureExternalCallCollector,
    configureSqlQueryCollector,
    externalCallCollectorStorage,
    getRecordedExternalCallsOrEmpty,
    getRecordedSqlsOrEmpty,
    normalizeSqlPattern,
    recordExternalCall,
    recordSql,
    sqlQueryCollectorStorage,
    summarizeSqlPatterns,
    traceExternalCall,
} from '../index';

describe('observability helpers', () => {
    beforeEach(() => {
        configureSqlQueryCollector({ maxQueriesPerRequest: 100, maxSqlLengthBytes: 2048 });
        configureExternalCallCollector({
            maxEntriesPerRequest: 200,
            maxTargetLength: 256,
            maxOpLength: 64,
            maxErrorLength: 200,
        });
    });

    it('records and summarizes SQL events inside collector storage', () => {
        sqlQueryCollectorStorage.run([], () => {
            recordSql({
                level: 'query',
                query: { sql: 'select * from orders where id = $1', parameters: [123] },
                queryDurationMillis: 4.2,
            } as unknown as LogEvent);
            recordSql({
                level: 'query',
                query: { sql: 'select * from orders where id = $2', parameters: [456] },
                queryDurationMillis: 1.3,
            } as unknown as LogEvent);

            const sqls = getRecordedSqlsOrEmpty();
            const summary = summarizeSqlPatterns(sqls, 2);

            expect(sqls).toHaveLength(2);
            expect(summary[0]).toMatchObject({ count: 2, nPlusOneSuspect: true });
        });
    });

    it('normalizes SQL literals and parameter placeholders', () => {
        expect(normalizeSqlPattern("select * from users where id = 42 and name = 'Ana'")).toBe(
            "select * from users where id = ? and name = '?'",
        );
    });

    it('records external calls and errors inside collector storage', async () => {
        await expect(
            externalCallCollectorStorage.run([], async () => {
                recordExternalCall({ kind: 'http', target: 'orders-service', op: 'GET /orders', durationMs: 12 });
                await expect(
                    traceExternalCall({ kind: 'redis', target: 'cache', op: 'get' }, async () => {
                        throw new Error('cache down');
                    }),
                ).rejects.toThrow('cache down');

                expect(getRecordedExternalCallsOrEmpty()).toEqual([
                    expect.objectContaining({
                        kind: 'http',
                        target: 'orders-service',
                        op: 'GET /orders',
                        durationMs: 12,
                    }),
                    expect.objectContaining({ kind: 'redis', target: 'cache', op: 'get', error: 'cache down' }),
                ]);
            }),
        ).resolves.toBeUndefined();
    });

    it('exports metrics as JSON and Prometheus text', () => {
        const metrics = new MetricsService();
        metrics.recordHttpRequest('GET', '/orders/:id', 200, 0.15);
        metrics.setGauge('queue_depth', 7, { queue: 'orders' });

        expect(metrics.toJSON()).toMatchObject({
            counters: { 'http_requests_total{method=GET,path=/orders/:id,status=200}': 1 },
            gauges: expect.objectContaining({ 'queue_depth{queue=orders}': 7 }),
        });
        expect(metrics.toPrometheusFormat()).toContain(
            'http_requests_total{method="GET",path="/orders/:id",status="200"} 1',
        );
        expect(metrics.toPrometheusFormat()).toContain('queue_depth{queue="orders"} 7');
    });
});
