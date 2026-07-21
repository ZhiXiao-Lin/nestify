import { Test } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import {
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
});

function createHttpContext(request: Record<string, unknown>) {
    const response = {
        statusCode: 200,
        get: jest.fn().mockReturnValue(undefined),
    };
    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as never;
}
