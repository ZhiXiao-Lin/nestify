# Nestify Framework Core

Nestify separates reusable backend API capabilities from the sample application. The packages in this document are generic framework building blocks for DDD-style NestJS APIs. They intentionally avoid product-specific and deployment-domain concepts.

## Package Boundary

| Package | Responsibility |
| --- | --- |
| `@a3s-lab/ddd` | Framework-independent DDD primitives: entities, aggregate roots, value objects, domain events, repositories, unit of work contracts, guards, and `Result`. |
| `@a3s-lab/cqrs` | NestJS CQRS adapter for publishing `@a3s-lab/ddd` domain events through the Nest event bus. |
| `@a3s-lab/http` | API response envelopes, business errors, validation pipes, request/correlation ids, pagination helpers, DTO serialization helpers, key/response transforms, presentation filters/interceptors, and OpenAPI decorators. |
| `@a3s-lab/security` | Default-deny guard primitives, public/role/permission route metadata, local/dev-only guards, path validation, sensitive operation metadata, JWT payload/token helpers, and role-permission checks. |
| `@a3s-lab/observability` | Request tracking context, SQL and external-call collectors, metrics service, Prometheus output, and HTTP metrics interceptor. |
| `@a3s-lab/resilience` | Retry, circuit breaker, cache, rate limiting, distributed lock decorators, services, guards, and interceptors. |
| `@a3s-lab/clickhouse` | NestJS module and service wrapper around the official ClickHouse JavaScript client. |
| `@a3s-lab/migrations` | Kysely migration helpers, auto-run module integration, and concurrent-safe non-transactional migration support. |
| `@a3s-lab/files` | File upload validation, storage client contracts, upload decorators, and NestJS upload interceptors. |

Each package has a package-level README with install notes, import examples, exported capabilities, and boundary notes:

- [`@a3s-lab/ddd`](../packages/ddd/README.md)
- [`@a3s-lab/cqrs`](../packages/cqrs/README.md)
- [`@a3s-lab/http`](../packages/http/README.md)
- [`@a3s-lab/security`](../packages/security/README.md)
- [`@a3s-lab/observability`](../packages/observability/README.md)
- [`@a3s-lab/resilience`](../packages/resilience/README.md)
- [`@a3s-lab/clickhouse`](../packages/clickhouse/README.md)
- [`@a3s-lab/migrations`](../packages/migrations/README.md)
- [`@a3s-lab/files`](../packages/files/README.md)

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

## Remaining Shared App Scope

The remaining `apps/api/src/shared/*` implementations were reviewed after the framework extraction. They should stay in
the sample API for now because they encode application choices rather than stable framework contracts:

| Area | Current decision | Reason |
| --- | --- | --- |
| `auth`, `tenant` | Keep app-local | JWT secret names, request user shape, role/resource defaults, and organization semantics are application policy. Generic JWT token helpers and role-permission checks live in `@a3s-lab/security`; app config and roles remain local. |
| `audit`, `feature-flags` | Keep app-local | They depend on app persistence/cache conventions and default flag/audit semantics. |
| `database`, `health`, `redis` | Keep app-local compatibility/integration | Database schema types, health indicators, and concrete infrastructure wiring belong to the example API. |
| `application/dto.base`, `base` | Defer | `BaseDto` has no current consumers, and `BaseService` couples a CRUD template to Kysely plus a pagination shape that differs from `@a3s-lab/http`; extract only after a smaller generic contract is used outside the sample app. Generic `IQuery` and `IUseCase` contracts live in `@a3s-lab/ddd`, so the old app wrappers have been removed. |
| `testing` | Defer | Test helpers currently include sample user, organization, Redis, and Kysely mock conventions; split out only framework-neutral builders later. |
| `infrastructure/messaging/messaging.interface` | Keep app-local compatibility/integration | This is a decoded NATS-style service facade for the sample health/integration layer, not the DDD domain event publisher. The generic domain event publisher lives in `@a3s-lab/cqrs`; concrete broker APIs remain in `@a3s-lab/nats`. |
| `infrastructure/storage/storage.interface` | Keep app-local compatibility/integration | This is a RustFS/S3-level bucket/object service facade used by sample infrastructure health checks. Generic upload contracts live in `@a3s-lab/files`; concrete object storage APIs remain in `@a3s-lab/rustfs`. |
| `file-upload` | Package-backed | Generic upload validation, storage client contracts, decorators, and interceptors now live in `@a3s-lab/files`; AppModule imports the package directly, and the legacy app wrappers have been removed. |
| `serialization`, `transform` | Package-backed | Generic DTO serialization helpers and key/response transforms now live in `@a3s-lab/http`; AppModule imports the package modules directly, and the legacy app wrappers have been removed. |
| `presentation` | Package-backed | Generic domain/http exception filters and request logging interceptor now live in `@a3s-lab/http`; sample API entry points import the package directly, and the legacy app wrappers have been removed. |
| `api-response`, `api-versioning`, `errors`, `metrics`, `tracking` | Package-backed | Generic global Nest module registrations now live in `@a3s-lab/http` and `@a3s-lab/observability`; AppModule imports the package modules directly, and the legacy app wrappers have been removed. |
| `messaging/event-bus` | Package-backed | Generic DDD domain event publishing through Nest CQRS now lives in `@a3s-lab/cqrs`; sample order handlers import the package contracts directly, and the legacy app wrappers have been removed. |
| `persistence/repository`, `persistence/unit-of-work` | Package-backed | Generic repository and unit of work contracts now live in `@a3s-lab/ddd`; the legacy app wrappers have been removed. |
| `cache`, `retry`, `rate-limiting`, `circuit-breaker`, `openapi`, `validation`, `domain`, `utils` | Already package-backed | These now live in core package exports, and the legacy app wrappers have been removed. The sample API no longer registers the empty `validation` or `openapi` app modules. |

Future extraction should only happen when an area has a package-level contract that does not depend on sample API
tables, request user conventions, environment variable names, or default business resources.

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

- DDD primitives, persistence contracts, and `Result`
- CQRS domain event publisher adapter
- HTTP envelopes, errors, request ids, and pagination
- HTTP interceptors and filters with Nest `Reflector` metadata
- HTTP presentation filters and logging interceptor
- Security path validation, metadata decorators, and default-deny behavior
- Security JWT token helper behavior
- Security role-permission checker behavior
- Observability collectors and metrics formatting
- Observability request tracking with SQL and external-call request stores
- Resilience retry, circuit breaker, and TTL cache
- Resilience module registration and interceptor metadata execution
- ClickHouse client routing and lifecycle
- Migration provider wrapping and module registration
- File upload validation, storage key handling, module registration, and upload interceptors

Run:

```bash
pnpm release:check
pnpm build
pnpm test
pnpm lint:check
```

`pnpm release:check` formats, lints, builds, tests, packs the framework core packages, and verifies each package manifest and tarball. The tarball verification checks public entry points, type declarations, README inclusion, workspace dependency rewriting, and absence of test/source/build-cache files.
