# @a3s-lab/observability

Request tracking, diagnostic collectors, and Prometheus-style metrics for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/observability @a3s-lab/http
pnpm add @nestjs/common express kysely rxjs
```

## Use

```ts
import { MetricsService, getRequestId, recordExternalCall } from '@a3s-lab/observability';

recordExternalCall({
    kind: 'http',
    target: 'upstream-api',
    op: 'POST /charges',
    durationMs: 42,
});

const requestId = getRequestId();
const metrics = new MetricsService();
metrics.recordHttpRequest('GET', '/resources/:id', 200, 0.12);
```

Register `TrackingInterceptor` and `MetricsInterceptor` with NestJS when request-scoped tracking and HTTP metrics should be captured automatically.

## Exports

- Async request tracking context helpers
- SQL and external-call collectors
- In-memory metrics service
- Prometheus text output
- Tracking and metrics interceptors

## Notes

This package exposes generic telemetry building blocks. Storage, alerting, scrape endpoints, and user identity conventions belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
