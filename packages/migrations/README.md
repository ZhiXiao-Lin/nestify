# @a3s-lab/migrations

Validated Kysely migration lifecycle helpers for NestJS APIs, including opt-in startup execution and selected non-transactional migrations.

## Install

```bash
pnpm add @a3s-lab/migrations @a3s-lab/kysely
pnpm add @nestjs/common kysely
```

## Use

Register `KyselyModule` so `MigrationRunner` can resolve `KyselyService`. Kysely registration is global by default; if your database module is deliberately scoped, pass that module through `MigrationModule.registerAsync({ imports: [...] })`.

```ts
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { KyselyModule } from '@a3s-lab/kysely';
import { MigrationModule } from '@a3s-lab/migrations';

@Module({
    imports: [
        KyselyModule.register({ config: databaseConfig }),
        MigrationModule.register({
            migrationFolder: resolve(process.cwd(), 'dist/migrations'),
            autoRun: true,
        }),
    ],
})
export class AppModule {}
```

The dynamic module is scoped by default. Set `isGlobal: true` only when consumers outside the importing module need `MigrationRunner`.

### Async configuration

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';

MigrationModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        migrationFolder: config.getOrThrow('MIGRATION_FOLDER'),
        autoRun: config.get('AUTO_MIGRATE') === 'true',
    }),
});
```

`isGlobal` belongs on `registerAsync(...)`, outside `useFactory`, because Nest must determine module scope before the factory runs.

## Run explicitly

Startup execution and explicit execution use the same runner. Concurrent calls on one `MigrationRunner` instance share the in-flight result; a later call checks for new pending migrations again.

```ts
import { Injectable } from '@nestjs/common';
import { MigrationRunner } from '@a3s-lab/migrations';

@Injectable()
export class DeploymentService {
    constructor(private readonly migrations: MigrationRunner) {}

    async migrate(): Promise<void> {
        await this.migrations.runMigrations();
    }
}
```

Kysely's dialect migration lock remains responsible for coordination between application instances. The package does not replace that database-level lock.

## Custom providers

A custom `MigrationProvider` can be used without a file-system folder.

```ts
import { createMigrator } from '@a3s-lab/migrations';

const migrator = createMigrator(db, {
    provider: remoteMigrationProvider,
});
```

Use `createFileMigrationProvider({ migrationFolder })` when only the file provider is needed. Options are validated before a migrator or Nest module starts; invalid folders, providers, patterns, and boolean flags throw `MigrationConfigurationError`.

## Non-transactional migrations

Names matching `/(^|_)concurrent(_|$)/i` run their `up` and `down` functions against the outer Kysely instance instead of Kysely's transactional migration connection. This supports operations such as PostgreSQL `CREATE INDEX CONCURRENTLY`.

```ts
// 20260722_add_orders_created_at_concurrent.ts
export async function up(db: Kysely<Database>): Promise<void> {
    await sql`create index concurrently if not exists orders_created_at_idx
              on orders(created_at)`.execute(db);
}
```

Override `nonTransactionalNamePattern` to use another naming convention, or set `wrapNonTransactionalMigrations: false` to disable wrapping. Patterns with `g` or `y` flags are evaluated deterministically and cannot leak `lastIndex` state across migration names.

These operations are outside the migration transaction. Make them idempotent because a later migration-table write or process failure can cause the operation to be attempted again.

## Startup policy

Startup migrations are fail-closed and disabled by default in every environment.

Precedence is:

1. Explicit `autoRun: true` or `autoRun: false`.
2. The exact environment value `AUTO_MIGRATE=true`; every other present value disables startup execution.
3. `autoRunInProduction: true` when `NODE_ENV=production`.
4. Disabled.

Kysely result sets are also handled fail-closed: any defined `error`, including falsy non-`undefined` values, is thrown; inconsistent `Error` or `NotExecuted` results without an error value throw `MigrationExecutionError`.

## Exports

- `MigrationModule`, `MigrationRunner`, and `MIGRATION_MODULE_OPTIONS`
- `createMigrator` and `createFileMigrationProvider`
- `ConcurrentSafeMigrationProvider` and `NON_TRANSACTIONAL_MIGRATION_NAME`
- `createMigrationModuleOptions` and `normalizeCreateMigratorOptions`
- `MigrationConfigurationError` and `MigrationExecutionError`
- Static, async, normalized, provider, and runtime option types

## Notes

This package supplies migration execution primitives. Migration files, schema ownership, environment variable names, database privileges, backup policy, and release timing belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
