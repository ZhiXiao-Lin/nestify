# Nestify Framework Core

Nestify separates reusable backend API capabilities from the sample application. The packages in this document are generic framework building blocks for DDD-style NestJS APIs. They intentionally avoid product-specific and deployment-domain concepts.

## Package Boundary

| Package | Responsibility |
| --- | --- |
| `@a3s-lab/ddd` | Framework-independent DDD primitives: entities, aggregate roots, value objects, domain events, repositories, guards, and `Result`. |
| `@a3s-lab/http` | API response envelopes, business errors, validation pipes, request/correlation ids, pagination helpers, and OpenAPI decorators. |
| `@a3s-lab/security` | Default-deny guard primitives, public route metadata, local/dev-only guards, path validation, sensitive operation metadata, and JWT payload types. |
| `@a3s-lab/observability` | Request tracking context, SQL and external-call collectors, metrics service, Prometheus output, and HTTP metrics interceptor. |
| `@a3s-lab/resilience` | Retry, circuit breaker, cache, rate limiting, distributed lock decorators, services, guards, and interceptors. |
| `@a3s-lab/clickhouse` | NestJS module and service wrapper around the official ClickHouse JavaScript client. |
| `@a3s-lab/migrations` | Kysely migration helpers, auto-run module integration, and concurrent-safe non-transactional migration support. |

## Application Compatibility Layer

`apps/api/src/shared/*` keeps compatibility paths for the example API. Most files now re-export or lightly adapt the package-level APIs. This lets existing application modules keep their current imports while the reusable framework surface lives in packages.

Examples:

```ts
export { Result, voidOk } from '@a3s-lab/ddd';
export * from '@a3s-lab/http';
export { MetricsService } from '@a3s-lab/observability';
export { RetryService } from '@a3s-lab/resilience';
```

New application code can import directly from the packages. Existing application code can continue through `apps/api/src/shared/*` until a later import cleanup.

## Design Rules

- Keep framework packages generic and API-focused.
- Do not move business entities, order-specific rules, sample DTOs, or product-domain concepts into packages.
- Prefer package-level implementations for cross-cutting behavior and keep app-level files as compatibility wrappers.
- Keep NestJS dependencies in packages that need Nest integration; keep DDD primitives framework-independent.
- Keep package names short and capability-based, for example `@a3s-lab/http`.

## Migration Naming

`@a3s-lab/migrations` treats migration names matching `/(^|_)concurrent(_|$)/i` as non-transactional. These migrations are wrapped so `up` and `down` run against the outer Kysely instance instead of Kysely's transactional migration connection.

Use this for database operations such as PostgreSQL concurrent index creation:

```ts
export async function up(db: Kysely<unknown>) {
    await sql`create index concurrently if not exists orders_created_at_idx on orders(created_at)`.execute(db);
}
```

## Verification

The framework core is covered by package tests for:

- DDD primitives and `Result`
- HTTP envelopes, errors, request ids, and pagination
- Security path validation, metadata decorators, and default-deny behavior
- Observability collectors and metrics formatting
- Resilience retry, circuit breaker, and TTL cache
- ClickHouse client routing and lifecycle
- Migration provider wrapping and module registration

Run:

```bash
pnpm build
pnpm test
pnpm lint:check
```
