# @a3s-lab/observability

Bounded request tracking, privacy-aware diagnostic collectors, in-memory Prometheus metrics, and dependency-aware health checks for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/observability @a3s-lab/http
pnpm add @nestjs/common @nestjs/core @nestjs/terminus express kysely rxjs
```

The NestJS, Terminus, Express, Kysely, and RxJS packages are peer dependencies so applications keep a single framework/runtime instance.

## Use

### Request tracking and collectors

Import `TrackingModule` once to establish request, correlation, SQL, and external-call `AsyncLocalStorage` scopes for HTTP requests.

```ts
import { Module } from '@nestjs/common';
import {
    TrackingModule,
    configureExternalCallCollector,
    configureSqlQueryCollector,
} from '@a3s-lab/observability';

configureSqlQueryCollector({
    maxQueriesPerRequest: 100,
    maxSqlLengthBytes: 2048,
    captureRawSql: false,
    captureParameters: false,
    captureErrorDetails: false,
});

configureExternalCallCollector({
    maxEntriesPerRequest: 200,
    maxTargetLength: 256,
    maxOpLength: 64,
    maxErrorLength: 200,
    captureErrorDetails: false,
});

@Module({ imports: [TrackingModule] })
export class AppModule {}
```

The collectors are no-ops outside a tracking scope. Getter functions return defensive snapshots, so a diagnostics response cannot mutate the active request store.

```ts
import {
    getRecordedExternalCallsOrEmpty,
    getRecordedSqlsOrEmpty,
    getTrackingContext,
    recordExternalCall,
    traceExternalCall,
} from '@a3s-lab/observability';

recordExternalCall({
    kind: 'http',
    target: 'billing-api',
    op: 'POST /charges',
    durationMs: 42,
});

const result = await traceExternalCall(
    { kind: 'redis', target: 'cache', op: 'get' },
    () => redis.get('resource:1'),
);

const diagnostics = {
    tracking: getTrackingContext(),
    sql: getRecordedSqlsOrEmpty(),
    externalCalls: getRecordedExternalCallsOrEmpty(),
};
```

Wire `recordSql` into Kysely's query logger. By default it stores a normalized SQL pattern: comments, string/numeric literals, PostgreSQL placeholders, and dollar-quoted values do not retain their original values. Set `captureRawSql`, `captureParameters`, or `captureErrorDetails` only for a controlled diagnostic environment.

```ts
import { createPostgresKyselyModuleOptions } from '@a3s-lab/kysely';
import { recordSql } from '@a3s-lab/observability';

const options = createPostgresKyselyModuleOptions({
    host: 'localhost',
    database: 'app',
    logger: { onQuery: recordSql },
});
```

### Metrics

`MetricsModule` registers the metrics service, `/metrics`, `/metrics/json`, and a global HTTP interceptor. Use bounded limits at startup; invalid or unsafe limits fail before the application starts.

```ts
import { Module } from '@nestjs/common';
import { MetricsModule, MetricsService } from '@a3s-lab/observability';

@Module({
    imports: [
        MetricsModule.register({
            maxMetrics: 1000,
            maxSeriesPerMetric: 1000,
            maxLabelValueLength: 200,
        }),
    ],
})
export class AppModule {}

const metrics = new MetricsService();
metrics.registerCounter({ name: 'jobs_total', help: 'Processed jobs' });
metrics.incCounter('jobs_total', { queue: 'default' });

metrics.registerHistogram({
    name: 'job_duration_seconds',
    help: 'Job processing duration',
    buckets: [0.01, 0.1, 0.5, 1, 5],
});
metrics.observeHistogram('job_duration_seconds', 0.12, { queue: 'default' });
```

Async configuration preserves the Nest dependency edge through `imports` and `inject`.

```ts
MetricsModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        maxSeriesPerMetric: config.get('METRICS_MAX_SERIES', 1000),
    }),
});
```

HTTP request metrics use the Express route template rather than the raw request URL. Non-HTTP transports bypass the interceptor, active-request gauges begin at Observable subscription time, synchronous/async failures are cleaned up, and malformed content lengths are ignored.

### Health checks

Health check factories may inject providers only from modules visible to `HealthModule`. Reuse the exact configured dynamic module instance in both the root imports and `HealthModule.register({ imports: [...] })`.

```ts
const databaseModule = KyselyModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: createDatabaseOptions,
});

@Module({
    imports: [
        databaseModule,
        HealthModule.register({
            imports: [databaseModule],
            checks: [
                {
                    name: 'database',
                    inject: [KyselyService],
                    useFactory: (database: KyselyService<unknown>) =>
                        createHealthCheck(
                            'database',
                            () => sql`SELECT 1`.execute(database),
                            'Database check failed',
                            { timeoutMs: 3000 },
                        ),
                },
            ],
            liveStatus: { status: 'alive' },
        }),
    ],
})
export class AppModule {}
```

Checks time out after five seconds by default and receive an `AbortSignal` for cooperative cancellation. Underlying errors are hidden unless `exposeErrorDetails: true` is explicitly selected. Check names, duplicate registrations, factory results, timeouts, injected dependencies, and liveness payloads are validated at startup.

The module exposes:

```text
GET /health
GET /health/live
GET /health/ready
```

## Exports

- `TrackingModule`, `TrackingInterceptor`, tracking context helpers, and `trackingStorage`
- SQL collector configuration, request snapshots, normalization, N+1 summaries, `recordSql`, and `sqlQueryCollectorStorage`
- External-call collector configuration, request snapshots, `recordExternalCall`, `traceExternalCall`, and `externalCallCollectorStorage`
- `MetricsModule`, async module options, `MetricsService`, controllers/interceptors, metric definitions, and bounded defaults
- `HealthModule`, `HealthController`, `createHealthCheck`, health option/registration types, tokens, defaults, and `HealthProbeTimeoutError`

## Notes

- SQL text, SQL parameters, external error details, and health failure details can contain secrets. Their detailed forms are opt-in; keep them disabled in normal production diagnostics.
- Collector configuration is process-wide, while entries are isolated per request by `AsyncLocalStorage`. Configure it once during bootstrap. The exported storage objects are low-level escape hatches; prefer snapshot getters.
- Request and correlation IDs accept a restricted 128-character transport-safe alphabet; unsafe inbound values are replaced rather than truncated. Actor and subject IDs are read only from own data properties, normalized, and bounded.
- Collector entry counts, text sizes, parameter depth/count, health payload depth, health latency, metric names, label counts, label values, metric count, and series cardinality are all bounded.
- Excess metric label series aggregate into `cardinality_limited="true"`. That label and histogram's `le` label are reserved. Metric types, help text, and observed histogram buckets cannot be redefined incompatibly.
- Prometheus HELP text and label values are escaped. Keep all custom labels low-cardinality and free of personal or secret data.
- `/metrics` and especially `/metrics/json` may expose operational topology. Protect them with network policy or application authorization appropriate to the deployment.
- Telemetry recording is best-effort and must not replace the application result. Startup configuration errors remain fail-fast.

See the [framework core guide](../../docs/framework-core.md) for package boundaries and repository-wide verification.
