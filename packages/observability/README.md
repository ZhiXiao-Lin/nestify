# @a3s-lab/observability

Request tracking, diagnostic collectors, and Prometheus-style metrics for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/observability @a3s-lab/http
pnpm add @nestjs/common @nestjs/core express kysely rxjs
```

## Use

```ts
import { MetricsModule, MetricsService, TrackingModule, getRequestId, recordExternalCall } from '@a3s-lab/observability';

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

Register the modules when request-scoped tracking, HTTP metrics, and a `/metrics` scrape endpoint should be enabled automatically.

```ts
@Module({
    imports: [TrackingModule, MetricsModule],
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

## Notes

This package exposes generic telemetry building blocks. Storage, alerting, and user identity conventions belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
