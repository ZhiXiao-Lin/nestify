import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
    DEFAULT_HISTOGRAM_BUCKETS,
    DEFAULT_SIZE_BUCKETS,
    METRICS_OPTIONS,
    MetricsInterceptor,
    MetricsModule,
    MetricsService,
    resolveHttpRouteTemplate,
    UNKNOWN_HTTP_ROUTE,
} from '../index';

describe('bounded metrics', () => {
    it('stores cumulative histogram buckets instead of raw observations', () => {
        const metrics = new MetricsService();
        metrics.registerHistogram({ name: 'job_duration_seconds', help: 'Job duration', buckets: [1, 2] });

        for (let index = 0; index < 10_000; index += 1) {
            metrics.observeHistogram('job_duration_seconds', index % 3 === 0 ? 0.5 : index % 3 === 1 ? 1.5 : 3, {
                queue: 'main',
            });
        }

        expect(metrics.toJSON()).toMatchObject({
            histograms: {
                'job_duration_seconds{queue=main}': {
                    buckets: { '1': 3334, '2': 6667, '+Inf': 10_000 },
                    count: 10_000,
                    sum: 16_665.5,
                },
            },
        });
        expect(metrics.toPrometheusFormat()).toContain('job_duration_seconds_bucket{le="2",queue="main"} 6667');

        const state = [...(metrics as never as { histograms: Map<string, object> }).histograms.values()][0];
        expect(state).toEqual(
            expect.objectContaining({
                boundaries: [1, 2],
                bucketCounts: [3334, 6667],
                count: 10_000,
            }),
        );
        expect(state).not.toHaveProperty('values');
    });

    it('bounds metric series and aggregates excess cardinality', () => {
        const metrics = new MetricsService({ maxSeriesPerMetric: 3 });
        metrics.registerCounter({ name: 'jobs_total', help: 'Jobs' });

        metrics.incCounter('jobs_total', { queue: 'first' });
        metrics.incCounter('jobs_total', { queue: 'second' });
        metrics.incCounter('jobs_total', { queue: 'third' });

        expect(metrics.toJSON()).toMatchObject({
            counters: {
                jobs_total: 0,
                'jobs_total{queue=first}': 1,
                'jobs_total{cardinality_limited=true}': 2,
            },
        });
        expect(
            Object.keys((metrics.toJSON().counters ?? {}) as object).filter(key => key.startsWith('jobs_total')),
        ).toHaveLength(3);
    });

    it('uses route templates and a fixed unmatched route label', () => {
        expect(resolveHttpRouteTemplate({ baseUrl: '/api', route: { path: '/orders/:id' } } as never)).toBe(
            '/api/orders/:id',
        );
        expect(resolveHttpRouteTemplate({ baseUrl: '/api', route: undefined } as never)).toBe(UNKNOWN_HTTP_ROUTE);
        expect(resolveHttpRouteTemplate({ baseUrl: '/api', route: { path: /orders/ } } as never)).toBe(
            UNKNOWN_HTTP_ROUTE,
        );
    });

    it('records exactly one HTTP metric series for a multi-value response', async () => {
        const metrics = new MetricsService();
        const interceptor = new MetricsInterceptor(metrics);
        const context = createHttpContext({
            method: 'GET',
            path: '/orders/user-controlled-slug',
            baseUrl: '/api',
            route: { path: '/orders/:id' },
            headers: {},
        });

        await expect(
            lastValueFrom(interceptor.intercept(context, { handle: () => of('first', 'second') })),
        ).resolves.toBe('second');

        expect(
            metrics.getCounter('http_requests_total', { method: 'GET', path: '/api/orders/:id', status: '200' }),
        ).toBe(1);
        expect(
            metrics.getCounter('http_requests_total', { method: 'GET', path: UNKNOWN_HTTP_ROUTE, status: '200' }),
        ).toBe(0);
        expect(metrics.getGauge('http_active_requests')).toBe(0);
    });

    it('injects bounded configuration through MetricsModule.register', async () => {
        expect(MetricsModule.register({ maxSeriesPerMetric: 25, maxLabelValueLength: 80 })).toMatchObject({
            module: MetricsModule,
            providers: [
                {
                    provide: METRICS_OPTIONS,
                    useValue: { maxSeriesPerMetric: 25, maxLabelValueLength: 80 },
                },
            ],
        });

        const module = await Test.createTestingModule({
            imports: [MetricsModule.register({ maxSeriesPerMetric: 3 })],
        }).compile();
        const metrics = module.get(MetricsService);
        metrics.registerCounter({ name: 'bounded_total', help: 'Bounded' });
        metrics.incCounter('bounded_total', { value: 'first' });
        metrics.incCounter('bounded_total', { value: 'second' });
        metrics.incCounter('bounded_total', { value: 'third' });

        expect(
            Object.keys((metrics.toJSON().counters ?? {}) as object).filter(key => key.startsWith('bounded_total')),
        ).toHaveLength(3);
        await module.close();
    });

    it('validates resource limits and freezes shared defaults', () => {
        expect(Object.isFrozen(DEFAULT_HISTOGRAM_BUCKETS)).toBe(true);
        expect(Object.isFrozen(DEFAULT_SIZE_BUCKETS)).toBe(true);
        expect(() => new MetricsService(null as never)).toThrow(TypeError);
        expect(() => new MetricsService({ maxSeriesPerMetric: 1 })).toThrow(RangeError);
        expect(() => new MetricsService({ maxSeriesPerMetric: 100_001 })).toThrow(RangeError);
        expect(() => new MetricsService({ maxLabelValueLength: 0 })).toThrow(RangeError);
        expect(() => new MetricsService({ maxMetrics: 5 })).toThrow(RangeError);

        const atCapacity = new MetricsService({ maxMetrics: 6 });
        expect(() => atCapacity.registerCounter({ name: 'custom_total', help: 'Custom' })).toThrow('metric capacity');
    });

    it('validates definitions, escapes help, and prevents metric type changes', () => {
        const metrics = new MetricsService();
        metrics.registerCounter({ name: 'jobs_total', help: 'Jobs\n# TYPE injected gauge' });
        expect(metrics.toPrometheusFormat()).toContain('# HELP jobs_total Jobs\\n# TYPE injected gauge');
        expect(metrics.toPrometheusFormat()).not.toContain('Jobs\n# TYPE injected gauge');
        expect(() => metrics.registerCounter({ name: 'jobs_total', help: 'Different' })).toThrow('cannot change help');
        expect(() => metrics.registerCounter({ name: 'invalid-name', help: 'Invalid' })).toThrow(TypeError);
        expect(() => metrics.registerCounter({ name: 'empty_help', help: ' ' })).toThrow(TypeError);
        expect(() => metrics.registerCounter({ name: 'long_help', help: 'x'.repeat(1025) })).toThrow(RangeError);

        metrics.registerGauge({ name: 'queue_depth', help: 'Queue depth' });
        expect(() => metrics.registerGauge({ name: 'queue_depth', help: 'Different' })).toThrow('cannot change help');
        metrics.registerHistogram({ name: 'latency_seconds', help: 'Latency', buckets: [1] });
        expect(() => metrics.registerHistogram({ name: 'latency_seconds', help: 'Different', buckets: [1] })).toThrow(
            'cannot change help',
        );

        metrics.setGauge('implicit_metric', 1);
        expect(() => metrics.incCounter('implicit_metric')).toThrow('already registered as gauge');
    });

    it('validates labels and protects reserved histogram and overflow labels', () => {
        const metrics = new MetricsService();
        metrics.registerCounter({ name: 'jobs_total', help: 'Jobs' });
        expect(() => metrics.incCounter('jobs_total', { cardinality_limited: 'true' })).toThrow('reserved');
        expect(() => metrics.incCounter('jobs_total', { 'invalid-name': 'value' })).toThrow(TypeError);
        expect(() => metrics.incCounter('jobs_total', { queue: 1 as never })).toThrow(TypeError);
        expect(() =>
            metrics.incCounter(
                'jobs_total',
                Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`label_${index}`, 'value'])),
            ),
        ).toThrow(RangeError);
        expect(() => metrics.observeHistogram('latency_seconds', 1, { le: '1' })).toThrow('reserved le');

        const bounded = new MetricsService({ maxLabelValueLength: 3 });
        bounded.incCounter('bounded_total', { value: 'long value' });
        expect(bounded.toPrometheusFormat()).toContain('value="__label_value_too_long__"');
    });

    it('rejects non-finite accumulation and unsafe histogram definitions', () => {
        const metrics = new MetricsService();
        metrics.setGauge('large_gauge', Number.MAX_VALUE);
        expect(() => metrics.incGauge('large_gauge', undefined, Number.MAX_VALUE)).toThrow(RangeError);
        metrics.incCounter('large_counter', undefined, Number.MAX_VALUE);
        expect(() => metrics.incCounter('large_counter', undefined, Number.MAX_VALUE)).toThrow(RangeError);
        expect(() => metrics.incCounter('negative_total', undefined, -1)).toThrow(RangeError);
        expect(() => metrics.setGauge('invalid_gauge', Number.NaN)).toThrow(TypeError);
        expect(() => metrics.observeHistogram('invalid_histogram_value', Number.NaN)).toThrow(TypeError);
        expect(() => metrics.registerHistogram({ name: 'empty_histogram', help: 'Empty', buckets: [] })).toThrow(
            RangeError,
        );
        expect(() =>
            metrics.registerHistogram({
                name: 'invalid_histogram',
                help: 'Invalid',
                buckets: [Number.POSITIVE_INFINITY],
            }),
        ).toThrow(TypeError);
        expect(() =>
            metrics.registerHistogram({ name: 'huge_histogram', help: 'Huge', buckets: Array(1001).fill(1) }),
        ).toThrow(RangeError);

        metrics.registerHistogram({ name: 'stable_histogram', help: 'Stable', buckets: [1, 2] });
        metrics.registerHistogram({ name: 'stable_histogram', help: 'Stable', buckets: [2, 3] });
        metrics.observeHistogram('stable_histogram', 1);
        expect(() => metrics.registerHistogram({ name: 'stable_histogram', help: 'Stable', buckets: [1, 4] })).toThrow(
            'cannot change buckets',
        );

        const implicit = new MetricsService();
        implicit.observeHistogram('implicit_histogram', 0.5);
        expect(() =>
            implicit.registerHistogram({ name: 'implicit_histogram', help: 'Implicit', buckets: [1, 2] }),
        ).toThrow('differ from existing observations');

        const histogramState = [
            ...(implicit as never as { histograms: Map<string, { count: number }> }).histograms.values(),
        ][0];
        histogramState.count = Number.MAX_SAFE_INTEGER;
        expect(() => implicit.observeHistogram('implicit_histogram', 0.5)).toThrow('observation count overflow');
    });

    it('normalizes HTTP dimensions and rejects invalid direct observations', () => {
        const metrics = new MetricsService();
        metrics.recordHttpRequest('get', 'orders/:id', 200, 0.1);
        expect(metrics.getCounter('http_requests_total', { method: 'GET', path: '/orders/:id', status: '200' })).toBe(
            1,
        );
        metrics.recordHttpRequest('GET', '/bad?user=value', 99, 0.2);
        expect(
            metrics.getCounter('http_requests_total', { method: 'GET', path: UNKNOWN_HTTP_ROUTE, status: '500' }),
        ).toBe(1);
        expect(() => metrics.recordHttpRequest('bad method', '/', 200, 1)).toThrow(TypeError);
        expect(() => metrics.recordHttpRequest('GET', '/', 200, -1)).toThrow(RangeError);
    });

    it('starts active-request tracking on subscription and cleans up synchronous errors', async () => {
        const metrics = new MetricsService();
        const interceptor = new MetricsInterceptor(metrics);
        const context = createHttpContext({ method: 'GET', baseUrl: '/api', route: { path: '/jobs' }, headers: {} });
        const stream = interceptor.intercept(context, { handle: () => of('ok') });
        expect(metrics.getGauge('http_active_requests')).toBe(0);
        await expect(lastValueFrom(stream)).resolves.toBe('ok');
        expect(metrics.getGauge('http_active_requests')).toBe(0);

        const failure = Object.assign(new Error('teapot'), { status: 418 });
        await expect(
            lastValueFrom(
                interceptor.intercept(context, {
                    handle: () => {
                        throw failure;
                    },
                }),
            ),
        ).rejects.toBe(failure);
        expect(metrics.getGauge('http_active_requests')).toBe(0);
        expect(metrics.getCounter('http_requests_total', { method: 'GET', path: '/api/jobs', status: '418' })).toBe(1);
    });

    it('bypasses non-HTTP transports and records async error status safely', async () => {
        const metrics = new MetricsService();
        const interceptor = new MetricsInterceptor(metrics);
        const rpcContext = {
            getType: () => 'rpc',
            switchToHttp: () => {
                throw new Error('must not access HTTP context');
            },
        } as never;
        await expect(lastValueFrom(interceptor.intercept(rpcContext, { handle: () => of('rpc') }))).resolves.toBe(
            'rpc',
        );
        expect(metrics.getCounter('http_requests_total')).toBe(0);

        const context = createHttpContext({ method: 'POST', baseUrl: '', route: { path: '/jobs' }, headers: {} });
        await expect(
            lastValueFrom(
                interceptor.intercept(context, {
                    handle: () => throwError(() => Object.assign(new Error('unavailable'), { statusCode: 503 })),
                }),
            ),
        ).rejects.toThrow('unavailable');
        expect(metrics.getCounter('http_requests_total', { method: 'POST', path: '/jobs', status: '503' })).toBe(1);

        await expect(
            lastValueFrom(
                interceptor.intercept(context, {
                    handle: () => throwError(() => 'primitive failure'),
                }),
            ),
        ).rejects.toBe('primitive failure');
        expect(metrics.getCounter('http_requests_total', { method: 'POST', path: '/jobs', status: '500' })).toBe(1);
    });

    it('parses content lengths strictly and clears runtime state on shutdown', async () => {
        const metrics = new MetricsService();
        const interceptor = new MetricsInterceptor(metrics);
        const context = createHttpContext(
            {
                method: 'POST',
                baseUrl: '',
                route: { path: '/upload' },
                headers: { 'content-length': '12' },
            },
            '14bytes',
        );
        await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') }));
        expect(metrics.toJSON()).toMatchObject({
            histograms: expect.objectContaining({
                'http_request_size_bytes{method=POST,path=/upload}': expect.objectContaining({ count: 1, sum: 12 }),
            }),
        });
        expect(JSON.stringify(metrics.toJSON())).not.toContain('http_response_size_bytes{method=POST,path=/upload}');
        metrics.onModuleDestroy();
        expect(metrics.toJSON()).toEqual({ counters: {}, gauges: {}, histograms: {} });
    });

    it('records valid response sizes and contains internal telemetry failures', async () => {
        const metrics = new MetricsService();
        const interceptor = new MetricsInterceptor(metrics);
        const context = createHttpContext(
            {
                method: 'GET',
                baseUrl: '',
                route: { path: '/download' },
                headers: { 'content-length': ['10'] },
            },
            24,
        );
        await lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') }));
        expect(metrics.toJSON()).toMatchObject({
            histograms: expect.objectContaining({
                'http_request_size_bytes{method=GET,path=/download}': expect.objectContaining({ sum: 10 }),
                'http_response_size_bytes{method=GET,path=/download}': expect.objectContaining({ sum: 24 }),
            }),
        });

        const invalidContext = createHttpContext({
            method: 'invalid method',
            baseUrl: '',
            route: { path: '/safe' },
            headers: {},
        });
        await expect(lastValueFrom(interceptor.intercept(invalidContext, { handle: () => of('safe') }))).resolves.toBe(
            'safe',
        );
        expect(metrics.getGauge('http_active_requests')).toBe(0);

        const unavailableMetrics = {
            incGauge: jest.fn(() => {
                throw new Error('metrics unavailable');
            }),
        };
        await expect(
            lastValueFrom(
                new MetricsInterceptor(unavailableMetrics as never).intercept(context, {
                    handle: () => of('fallback'),
                }),
            ),
        ).resolves.toBe('fallback');
    });

    it('resolves async module configuration through imported providers', async () => {
        const configToken = Symbol('METRICS_CONFIG');
        @Module({ providers: [{ provide: configToken, useValue: 3 }], exports: [configToken] })
        class ConfigModule {}

        const module = await Test.createTestingModule({
            imports: [
                MetricsModule.registerAsync({
                    imports: [ConfigModule],
                    inject: [configToken],
                    useFactory: async (maxSeriesPerMetric: number) => ({ maxSeriesPerMetric }),
                }),
            ],
        }).compile();
        const metrics = module.get(MetricsService);
        metrics.registerCounter({ name: 'async_total', help: 'Async' });
        metrics.incCounter('async_total', { value: 'first' });
        metrics.incCounter('async_total', { value: 'second' });
        metrics.incCounter('async_total', { value: 'third' });
        expect(
            Object.keys((metrics.toJSON().counters ?? {}) as object).filter(key => key.startsWith('async_total')),
        ).toHaveLength(3);
        await module.close();

        expect(() => MetricsModule.register(null as never)).toThrow(TypeError);
        expect(() => MetricsModule.registerAsync(null as never)).toThrow(TypeError);
        expect(() => MetricsModule.registerAsync({ useFactory: null as never })).toThrow(TypeError);
        expect(() => MetricsModule.registerAsync({ imports: null as never, useFactory: () => ({}) })).toThrow(
            TypeError,
        );
        expect(() => MetricsModule.registerAsync({ inject: null as never, useFactory: () => ({}) })).toThrow(TypeError);

        await expect(
            Test.createTestingModule({
                imports: [MetricsModule.registerAsync({ useFactory: () => null as never })],
            }).compile(),
        ).rejects.toThrow('must return an options object');
    });

    it('uses a fixed route label for unsafe and oversized route templates', () => {
        expect(resolveHttpRouteTemplate({ baseUrl: '/api', route: { path: '/orders?raw=true' } } as never)).toBe(
            UNKNOWN_HTTP_ROUTE,
        );
        expect(resolveHttpRouteTemplate({ baseUrl: '', route: { path: `/${'x'.repeat(513)}` } } as never)).toBe(
            UNKNOWN_HTTP_ROUTE,
        );
        expect(resolveHttpRouteTemplate({ baseUrl: 42, route: { path: 'orders' } } as never)).toBe('/orders');
    });
});

function createHttpContext(request: Record<string, unknown>, responseContentLength?: unknown) {
    const response = {
        statusCode: 200,
        get: jest.fn().mockReturnValue(responseContentLength),
    };
    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as never;
}
