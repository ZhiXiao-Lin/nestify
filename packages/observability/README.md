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
        MetricsModule,
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

This package exposes generic telemetry building blocks. Storage, alerting, and user identity conventions belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
