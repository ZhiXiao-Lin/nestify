# @a3s-lab/observability

Request tracking, diagnostic collectors, Prometheus-style metrics, and health check endpoints for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/observability @a3s-lab/http
pnpm add @nestjs/common @nestjs/core @nestjs/terminus express kysely rxjs
```

## Use

```ts
import {
    HealthModule,
    MetricsModule,
    MetricsService,
    TrackingModule,
    createHealthCheck,
    getRequestId,
    recordExternalCall,
} from '@a3s-lab/observability';

recordExternalCall({
    kind: 'http',
    target: 'upstream-api',
    op: 'POST /resources',
    durationMs: 42,
});

const requestId = getRequestId();
const metrics = new MetricsService();
metrics.recordHttpRequest('GET', '/resources/:id', 200, 0.12);
```

Register the modules when request-scoped tracking, HTTP metrics, a `/metrics` scrape endpoint, and health endpoints should be enabled automatically.

```ts
@Module({
    imports: [
        TrackingModule,
        MetricsModule.register({
            maxSeriesPerMetric: 1000,
            maxLabelValueLength: 200,
        }),
        HealthModule.register({
            checks: [
                {
                    name: 'database',
                    inject: [DatabaseService],
                    useFactory: (database: DatabaseService) =>
                        createHealthCheck('database', () => database.ping(), 'Database check failed'),
                },
            ],
        }),
    ],
})
export class AppModule {}
```

## Exports

- Async request tracking context helpers
- SQL and external-call collectors
- In-memory metrics service
- Prometheus text output
- Tracking and metrics interceptors
- Nest modules for request tracking and metrics endpoints
- Health module and health check factory helpers

## Notes

Histograms retain cumulative bucket counts, count, and sum instead of raw observations, so memory use does not grow
with request volume. Every metric also has a bounded number of label series; excess labels are aggregated into a
`cardinality_limited="true"` series. Long label values use a fixed sentinel.

HTTP metrics use the Express route template (including `baseUrl`) rather than the raw request path. Unmatched or
non-string routes use the fixed `__unmatched__` label, preventing user-controlled URL slugs from creating unbounded
series. Applications should keep custom metric labels similarly low-cardinality.

This package exposes generic telemetry building blocks. Storage, alerting, and user identity conventions belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
