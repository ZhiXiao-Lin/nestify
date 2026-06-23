# @a3s-lab/kysely

NestJS module helpers for Kysely-backed SQL access.

## Install

```bash
pnpm add @a3s-lab/kysely kysely pg
pnpm add -D @types/pg
```

## Use

```ts
import { KyselyModule, createPostgresKyselyModuleOptions } from '@a3s-lab/kysely';

@Module({
    imports: [
        KyselyModule.register(
            createPostgresKyselyModuleOptions({
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                password: 'postgres',
                database: 'app',
            }),
        ),
    ],
})
export class AppModule {}
```

## Exports

- `KyselyModule`
- `KyselyService`
- `KyselyLogger`
- Kysely module option contracts and configurable module definition helpers
- PostgreSQL option builders

## Notes

`createPostgresKyselyModuleOptions` is a small builder around `PostgresDialect` and `pg.Pool`. Applications still own their environment variable names, database names, schema types, migrations, and query policy.
