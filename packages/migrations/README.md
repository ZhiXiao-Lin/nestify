# @a3s-lab/migrations

Kysely migration helpers for NestJS APIs, including concurrent-safe handling for selected non-transactional migrations.

## Install

```bash
pnpm add @a3s-lab/migrations @a3s-lab/kysely
pnpm add @nestjs/common kysely
```

## Use

```ts
import { MigrationModule, createMigrator } from '@a3s-lab/migrations';

MigrationModule.register({
    migrationFolder: './dist/migrations',
    autoRun: true,
});

const migrator = createMigrator(db, {
    migrationFolder: './dist/migrations',
});
```

Migration names matching `/(^|_)concurrent(_|$)/i` run outside Kysely's transaction wrapper by default.

Startup migrations are disabled by default, including in production. Enable them explicitly with
`autoRun: true`, `autoRunInProduction: true`, or the exact environment value `AUTO_MIGRATE=true`.
An explicit `autoRun` option takes precedence over the environment, and an explicit
`AUTO_MIGRATE=false` disables the production opt-in.

## Exports

- File migration provider factory
- Concurrent-safe migration provider
- Migrator factory
- NestJS migration module and runner

## Notes

This package supplies migration execution primitives. Migration files, schema ownership, and release timing belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
