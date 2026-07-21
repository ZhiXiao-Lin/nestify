# @a3s-lab/kysely

Validated NestJS lifecycle integration for Kysely, PostgreSQL pool option builders, and bounded SQL diagnostics.

## Install

```bash
pnpm add @a3s-lab/kysely kysely pg
pnpm add @nestjs/common
pnpm add -D @types/pg
```

## Use

### PostgreSQL configuration

```ts
import { Module } from '@nestjs/common';
import { KyselyModule, createPostgresKyselyModuleOptions } from '@a3s-lab/kysely';

@Module({
    imports: [
        KyselyModule.register({
            ...createPostgresKyselyModuleOptions({
                host: process.env.POSTGRES_HOST,
                port: process.env.POSTGRES_PORT,
                user: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
                database: process.env.POSTGRES_DATABASE,
                max: process.env.POSTGRES_POOL_MAX,
            }),
            isGlobal: false,
        }),
    ],
})
export class DatabaseModule {}
```

The module remains global by default for backward compatibility. Set `isGlobal: false` when database access should stay inside an explicit module boundary.

`createPostgresPoolConfig` validates direct and inherited pool values before constructing `pg.Pool`:

- `port` must be an integer from 1 through 65535.
- `max` must be a positive safe integer.
- `pool.min` must be a non-negative safe integer and cannot exceed an explicitly configured maximum.
- Connection identity overrides must be strings.
- Empty direct overrides preserve the corresponding value from `pool`.

Invalid options throw `KyselyConfigurationError`; caller-owned input objects are never mutated.

### Async registration

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';

KyselyModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    isGlobal: false,
    useFactory: (config: ConfigService) =>
        createPostgresKyselyModuleOptions({
            host: config.getOrThrow('POSTGRES_HOST'),
            port: config.getOrThrow('POSTGRES_PORT'),
        }),
});
```

Resolved sync and async options pass through the same dialect validation before a service is created.

### Existing instances

```ts
import { Kysely } from 'kysely';

const database = new Kysely<Database>({ dialect });

KyselyModule.register({
    instance: database,
    isGlobal: false,
});
```

The exact instance is exposed under the `KyselyService` injection token. It remains caller-owned and the module does not destroy it. When the module creates `KyselyService` from `config`, explicit and Nest lifecycle destroy calls share one idempotent operation.

### Bounded SQL logging

```ts
createPostgresKyselyModuleOptions({
    logger: {
        consoleOutput: true,
        logParameters: false,
        logErrorStack: false,
        maxSqlLength: 10_000,
        maxParameterCount: 20,
        maxParameterLength: 256,
        onQuery: event => telemetry.record(event),
    },
});
```

Console parameter values and error stacks are disabled by default. SQL, errors, and explicitly enabled parameters are single-line and bounded; circular objects, BigInt values, invalid dates, and throwing serializers cannot escape into query execution as logger errors. SQL text can still contain application-authored literals, so use bound parameters for sensitive values.

`onQuery` receives the original event and may contain sensitive values. Hook failures are contained and reported without stopping query execution. An explicit Kysely `log` option takes precedence over the convenience `logger` configuration.

## Exports

- `KyselyModule` and `KyselyService`
- `KyselyConfigurationError` and `normalizeKyselyModuleOptions`
- Static, async, configured, normalized, and factory option contracts
- `createPostgresPoolConfig`, `createPostgresKyselyConfig`, and `createPostgresKyselyModuleOptions`
- `createKyselyLogger` and bounded logger defaults
- Configurable module definition tokens and types

## Notes

Applications still own environment variable names, database and schema types, migration policy, query policy, credentials, observability destinations, and external Kysely instance lifecycles.

Use [`@a3s-lab/migrations`](../migrations/README.md) for migration execution primitives. See the [framework core guide](../../docs/framework-core.md) for package boundaries.
