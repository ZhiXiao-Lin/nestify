# @a3s-lab/clickhouse

NestJS wrapper for the official ClickHouse JavaScript client.

## Install

```bash
pnpm add @a3s-lab/clickhouse
pnpm add @nestjs/common
```

## Use

```ts
import { ClickHouseModule, ClickHouseService } from '@a3s-lab/clickhouse';

ClickHouseModule.register({
    url: 'http://localhost:8123',
    database: 'analytics',
    application: 'api',
});

class EventReader {
    constructor(private readonly clickhouse: ClickHouseService) {}

    async read() {
        return this.clickhouse.queryJson<{ id: string }>('select id from events limit 10');
    }
}
```

## Exports

- `ClickHouseModule`
- `ClickHouseService`
- Module options, async options, request options, and JSON response types

## Notes

This package owns connection and query helpers only. Table schemas, query text, credentials, and deployment choices belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
