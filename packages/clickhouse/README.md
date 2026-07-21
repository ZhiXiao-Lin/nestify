# @a3s-lab/clickhouse

Lifecycle-safe NestJS integration for the official ClickHouse JavaScript client. It provides validated configuration, bounded per-database client reuse, request cancellation, typed query helpers, health reporting, and deterministic shutdown.

## Install

```bash
pnpm add @a3s-lab/clickhouse @nestjs/common
```

`@clickhouse/client` is installed as a direct dependency of this package.

## Use

Register one default database:

```ts
import { Module } from '@nestjs/common';
import { ClickHouseModule } from '@a3s-lab/clickhouse';

@Module({
    imports: [
        ClickHouseModule.register({
            url: 'https://clickhouse.example.com:8443',
            database: 'analytics',
            username: 'api',
            password: process.env.CLICKHOUSE_PASSWORD,
            application: 'reporting-api',
            requestTimeoutMs: 10_000,
            maxOpenConnections: 10,
            maxDatabaseClients: 16,
        }),
    ],
})
export class AppModule {}
```

`registerAsync()` supports configuration services and secret providers:

```ts
ClickHouseModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        url: config.getOrThrow('CLICKHOUSE_URL'),
        accessToken: config.get('CLICKHOUSE_ACCESS_TOKEN'),
        database: 'analytics',
    }),
});
```

JWT access tokens are mutually exclusive with URL or explicit username/password authentication. Advanced options from the first-party SDK, including TLS, tracing, custom logging, compression, and HTTP agents, can be supplied through `clientOptions`. Named package options take precedence:

```ts
ClickHouseModule.register({
    url: 'https://clickhouse.example.com:8443',
    database: 'analytics',
    clientOptions: {
        tls: { ca_cert: trustedCa },
        compression: { response: true, request: true },
        keep_alive: { enabled: true, idle_socket_ttl: 2_500 },
        clickhouse_settings: { async_insert: 1 },
    },
});
```

Use `createClickHouseClientOptions()` when the exact normalized first-party client configuration is needed outside Nest dependency injection:

```ts
import { createClickHouseClientOptions } from '@a3s-lab/clickhouse';

const clientOptions = createClickHouseClientOptions({
    url: process.env.CLICKHOUSE_URL,
    database: 'analytics',
    requestTimeoutMs: 5_000,
});
```

### Queries and commands

Prefer the explicit method matching the SQL result contract:

```ts
import { Injectable } from '@nestjs/common';
import { ClickHouseService } from '@a3s-lab/clickhouse';

@Injectable()
export class EventReader {
    constructor(private readonly clickhouse: ClickHouseService) {}

    read(tenantId: string) {
        return this.clickhouse.queryJson<{ id: string; kind: string }>(
            `select id, kind from events where tenant_id = {tenantId:String}`,
            {
                queryParams: { tenantId },
                queryId: `events-${tenantId}`,
                timeoutMs: 2_000,
            },
        );
    }

    optimize() {
        return this.clickhouse.command('optimize table events final');
    }
}
```

- `queryJson<T>()` consumes a `FORMAT JSON` response and returns its typed `data` envelope.
- `queryText()` consumes any supported text format; a trailing `FORMAT <name>` is parsed safely outside strings and comments.
- `command()` returns the official `CommandResult`, including its query id and server summary.
- `execute()` remains as a compatibility convenience and routes common result-producing statements to `queryText()`; new code should prefer explicit methods.

Request options support caller cancellation, bounded timeouts, query parameters, settings, sessions, roles, per-request authentication, HTTP headers, multipart parameters, and database routing:

```ts
const controller = new AbortController();

await clickhouse.queryText('select count() from events', {
    database: 'reporting',
    timeoutMs: 1_500,
    abortSignal: controller.signal,
    clickHouseSettings: { max_threads: 2 },
    role: 'reader',
});
```

The package combines the caller's signal with its timeout signal, so either condition cancels the request.

### Inserts

```ts
await clickhouse.insertJsonEachRow('events', [
    { id: 'event-1', kind: 'created' },
    { id: 'event-2', kind: 'confirmed' },
]);

const result = await clickhouse.insert('events', [{ id: 'event-3', kind: 'cancelled' }]);
```

`insertJsonEachRow()` preserves the original no-op behavior for an empty array. `insert()` delegates empty arrays to the official client and returns its `InsertResult`.

### Database client pool

The configured database owns one client. Request-level database overrides use an LRU pool capped by `maxDatabaseClients` (default `16`). `database: null` selects `rootDatabase` (default `default`).

Idle clients are closed before replacement. If every override client is busy, or an evicted client cannot be closed, allocation fails with `ClickHouseClientPoolExhaustedError` instead of exceeding the bound or reusing a closing client.

For advanced SDK operations, keep all work—including stream consumption—inside `withClient()` so shutdown and pool ownership remain correct:

```ts
await clickhouse.withClient(async client => {
    const result = await client.query({ query: 'select * from events', format: 'JSONEachRow' });
    for await (const rows of result.stream<{ id: string }>()) {
        consume(rows);
    }
}, { database: 'analytics' });
```

### Health and lifecycle

```ts
const health = await clickhouse.healthCheck();
const healthy = await clickhouse.ping();
const stats = clickhouse.getStats();
```

Health checks use an authenticated `SELECT` probe and return the database, latency, and failure message. `ping()` is the boolean compatibility helper.

Nest calls `close()` through `onModuleDestroy()`. Shutdown rejects new work, waits for registered operations within one total `shutdownTimeoutMs` deadline, attempts every client close concurrently, and reports aggregate failures as `ClickHouseShutdownError`. `close()` is public and idempotent for non-Nest runtimes.

## Exports

- `ClickHouseModule`, `ClickHouseService`, and `CLICKHOUSE_OPTIONS_TOKEN`
- `createClickHouseClientOptions`
- Module, request, health, statistics, JSON response, official client, result, format, authentication, and settings types
- `ClickHousePackageError` and configuration, request, closed-service, pool-exhaustion, and shutdown error classes

## Notes

- Use `queryParams` for values. SQL text, table names, database names, roles, and settings remain caller-owned policy; never interpolate untrusted identifiers.
- The package does not retry commands or inserts because doing so without application idempotency rules can duplicate work.
- Fully consume or close first-party result streams inside `withClient()`. Returning an unconsumed stream from the callback releases its lifecycle lease too early.
- The client pool is per Nest provider instance. It is not a cross-process connection coordinator.

See the [framework core guide](../../docs/framework-core.md) for package boundaries and release verification.
