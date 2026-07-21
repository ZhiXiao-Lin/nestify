# Nestify Framework Core

Nestify separates reusable backend API capabilities from the sample application. The packages in this document are generic framework building blocks for DDD-style NestJS APIs. They intentionally avoid product-specific and deployment-domain concepts.

## Package Boundary

| Package | Responsibility |
| --- | --- |
| `@a3s-lab/ddd` | Framework-independent DDD primitives: entities, aggregate roots, value objects, domain events, repositories, unit of work contracts, guards, and `Result`. |
| `@a3s-lab/cqrs` | NestJS CQRS adapter for publishing `@a3s-lab/ddd` domain events through the Nest event bus. |
| `@a3s-lab/http` | API response envelopes, business errors, validation pipes, request/correlation ids, pagination helpers, DTO serialization helpers, key/response transforms, presentation filters/interceptors, and OpenAPI decorators. |
| `@a3s-lab/security` | Default-deny guard primitives, public/role/permission route metadata, local/dev-only guards, path validation, sensitive operation metadata, JWT payload/token helpers, and role-permission checks. |
| `@a3s-lab/observability` | Request tracking, privacy-aware bounded SQL/external-call collectors, cardinality-safe Prometheus metrics, reactive HTTP instrumentation, and timeout-bound dependency-aware health checks. |
| `@a3s-lab/logger` | Structured logging service, async request context, and request logging interceptor for NestJS APIs. |
| `@a3s-lab/resilience` | Retry, circuit breaker, cache, rate limiting, distributed lock decorators, services, guards, and interceptors. |
| `@a3s-lab/kysely` | NestJS Kysely module, query logging, and PostgreSQL option builders for API database wiring. |
| `@a3s-lab/redisson` | NestJS Redisson module, Redis service helpers, and single-node Redis option builders. |
| `@a3s-lab/bullmq` | NestJS BullMQ module, queue service helpers, worker lifecycle, and queue metrics for background tasks. |
| `@a3s-lab/nats` | NestJS NATS module, publish/subscribe, request/reply, JetStream helpers, connection state, and lifecycle cleanup. |
| `@a3s-lab/rustfs` | NestJS S3-compatible object storage module, bucket operations, object operations, presigned URLs, multipart uploads, and health checks. |
| `@a3s-lab/etcd` | NestJS etcd module, key-value operations, JSON config helpers, local caching, watches, leases, compare-and-set, and health checks. |
| `@a3s-lab/clickhouse` | NestJS module and service wrapper around the official ClickHouse JavaScript client. |
| `@a3s-lab/migrations` | Kysely migration helpers, auto-run module integration, and concurrent-safe non-transactional migration support. |
| `@a3s-lab/files` | File upload validation, storage client contracts, upload decorators, and NestJS upload interceptors. |
| `@a3s-lab/ai` | NestJS module and service integration for the A3S coding-agent runtime provided by `@a3s-lab/code`. |
| `@a3s-lab/sandbox` | NestJS module, service, and connection helpers that lazily load the first-party `@a3s-lab/box` TypeScript SDK. |

Each package has a package-level README with install notes, import examples, exported capabilities, and boundary notes:

- [`@a3s-lab/ddd`](../packages/ddd/README.md)
- [`@a3s-lab/cqrs`](../packages/cqrs/README.md)
- [`@a3s-lab/http`](../packages/http/README.md)
- [`@a3s-lab/security`](../packages/security/README.md)
- [`@a3s-lab/observability`](../packages/observability/README.md)
- [`@a3s-lab/logger`](../packages/logger/README.md)
- [`@a3s-lab/resilience`](../packages/resilience/README.md)
- [`@a3s-lab/kysely`](../packages/kysely/README.md)
- [`@a3s-lab/redisson`](../packages/redisson/README.md)
- [`@a3s-lab/bullmq`](../packages/bullmq/README.md)
- [`@a3s-lab/nats`](../packages/nats/README.md)
- [`@a3s-lab/rustfs`](../packages/rustfs/README.md)
- [`@a3s-lab/etcd`](../packages/etcd/README.md)
- [`@a3s-lab/clickhouse`](../packages/clickhouse/README.md)
- [`@a3s-lab/migrations`](../packages/migrations/README.md)
- [`@a3s-lab/files`](../packages/files/README.md)
- [`@a3s-lab/ai`](../packages/ai/README.md)
- [`@a3s-lab/sandbox`](../packages/sandbox/README.md)

## Runtime Compatibility

The NestJS integration packages accept NestJS 10 and 11 peers. Workspace builds, tests, packed declarations, and the sample API run against NestJS 11; HTTP-facing package tests use Express 5 while their peer ranges continue to accept Express 4 and 5. Repository development requires Node.js 20.18.1 within the Node 20 line, or Node.js 22 and newer; Node 21 is excluded by the pinned A3S Box SDK dependency graph. The packed consumer smoke test pins TypeScript 5.3.3, the minimum compiler line supported by `@a3s-lab/sandbox` declarations.

`@a3s-lab/ai` delegates coding-agent execution to `@a3s-lab/code` and keeps native runtime loading behind its configured service boundary. `@a3s-lab/sandbox` lazily loads both runtime values and types from the first-party `@a3s-lab/box@3.0.11` TypeScript SDK, so importing the Nestify package does not eagerly evaluate its ESM dependency. Until `@a3s-lab/box` is published to npm, the package consumes the verified GitHub Release tarball; that dependency should switch to a semver range after npm publication without changing the Nestify API.

## Runtime Safety Defaults

- `SecurityModule.register()` globally installs a default-deny guard. `@Public()` is the explicit bypass, and all other
  routes require the configured authentication delegate unless global installation is deliberately disabled.
- The resilience rate-limit guard is global but only acts on decorated routes. It uses authenticated subjects or
  Express's trust-proxy-aware `request.ip`, hashes identities, isolates policies, and executes one atomic Redis script.
  Redis outage behavior is explicit (`local`, `allow`, or `deny`), and the local fallback has a hard entry limit.
- Metrics store cumulative histogram buckets rather than request samples. Each metric has a configurable series cap,
  excess labels aggregate into a fixed overflow series, and HTTP paths come only from route templates or a fixed
  unmatched label.
- Automatic migrations are fail-closed and require an explicit module or environment opt-in in production.

## Sample API Wiring

Reusable API framework capabilities now live in packages and are imported directly by the sample API. `apps/api/src/app.module.ts` composes the package modules, including Kysely PostgreSQL and Redisson Redis registration helpers; order-specific database schema types stay inside the order persistence adapter.

## Design Rules

- Keep framework packages generic and API-focused.
- Do not move business entities, order-specific rules, sample DTOs, or product-domain concepts into packages.
- Prefer package-level implementations for cross-cutting behavior and keep app-level files only for concrete application wiring.
- Keep NestJS dependencies in packages that need Nest integration; keep DDD primitives framework-independent.
- Keep package names short and capability-based, for example `@a3s-lab/http`.

## Reviewed App Scope

The former `apps/api/src/shared/*` implementations were reviewed after the framework extraction. Stable cross-cutting API behavior moved into packages; business-specific schema and policy stayed with the sample order module or was removed when unused:

| Area | Current decision | Reason |
| --- | --- | --- |
| `auth`, `tenant` | Removed unused app policy skeletons | The sample order API had no consumers for the app-level guards/decorators/services. Generic JWT token helpers, route metadata, and role-permission checks live in `@a3s-lab/security`. |
| `audit`, `feature-flags` | Removed unused app policy skeletons | The sample order API had no consumers for the app-level audit or feature-flag services, and their defaults encoded application policy rather than framework contracts. |
| `database`, `redis` | Package-backed module registration | Generic PostgreSQL and Redis option builders live in `@a3s-lab/kysely` and `@a3s-lab/redisson`; AppModule supplies concrete environment variable values. Order table schema types stay in the order persistence adapter. |
| `health` | Package-backed | Generic timeout-bound health endpoints and validated check registration live in `@a3s-lab/observability`; AppModule provides concrete database and Redis probes and passes their configured dynamic modules through `HealthModule.register({ imports })` so Nest can resolve factory dependencies. |
| `application/dto.base`, `base` | Removed unused app scaffold code | `BaseDto` had no consumers, and `BaseService` coupled a CRUD scaffold to Kysely plus a pagination shape that differs from `@a3s-lab/http`. Generic `IQuery` and `IUseCase` contracts live in `@a3s-lab/ddd`; no stable extra framework contract remained. |
| `testing` | Removed unused app scaffold code | Test helpers had no consumers and included sample user, organization, Redis, and Kysely mock conventions. Add framework-neutral builders later only when a package-level use case appears. |
| `infrastructure/messaging/messaging.interface` | Removed unused app integration interface | The NATS-style service facade had no active consumers after the DDD event publisher moved to `@a3s-lab/cqrs`; concrete broker APIs remain in `@a3s-lab/nats`. |
| `infrastructure/storage/storage.interface` | Removed unused app integration interface | The RustFS/S3-level bucket/object service facade had no active consumers. Generic upload contracts live in `@a3s-lab/files`; concrete object storage APIs live in `@a3s-lab/rustfs`. |
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
- Security path validation, metadata decorators, global default-deny behavior, and delegate integration
- Security JWT token helper behavior
- Security role-permission checker behavior
- Observability privacy defaults, bounded SQL/parameter/error serialization, literal normalization, request snapshots, and external-call tracing
- Observability cumulative histograms, metric/type invariants, bounded metric and label cardinality, escaped Prometheus metadata, route-template labels, and reactive interceptor cleanup
- Observability HTTP/non-HTTP request tracking isolation, bounded identity extraction, and collector teardown
- Observability health timeouts, abort signals, private failures, validated liveness payloads, factory results, and imported Nest dependencies
- Logger structured output, async context merging, and module registration
- Resilience retry, circuit breaker, TTL cache, atomic rate limiting, and bounded Redis outage policies
- Resilience module registration and interceptor metadata execution
- Kysely PostgreSQL option builders and module registration
- Redisson Redis option builders and module registration
- BullMQ queue creation, worker lifecycle, metrics, and module registration
- NATS module registration, publish/request encoding, subscriptions, JetStream publishing, and lifecycle cleanup
- RustFS client registration, bucket/object commands, presigned URLs, multipart uploads, error mapping, and health checks
- Etcd client registration, key-value operations, config cache, watches, leases, compare-and-set, health checks, and lifecycle cleanup
- ClickHouse client routing and lifecycle
- Migration provider wrapping and module registration
- File upload validation, storage key handling, module registration, and upload interceptors
- AI module registration, injected runtime access, session delegation, and lifecycle cleanup
- Sandbox connection configuration, module registration, lazy SDK access, operation delegation, and lifecycle cleanup

Run:

```bash
pnpm release:check
pnpm smoke:core-install
pnpm release:publish:dry-run
pnpm build
pnpm test
pnpm lint:check
```

`pnpm release:check` formats, lints, builds, tests, packs the framework core packages, and verifies each package manifest and tarball. The verification checks publishability metadata, public entry points, type declarations, repository metadata, required README sections, README inclusion in tarballs, workspace dependency rewriting, and absence of test/source/build-cache files.

`pnpm smoke:core-install` creates a temporary consumer project, installs the packed core package tarballs plus their peer dependencies, type-checks public imports, and runs a Node import smoke test.

The shared core package list is dependency-ordered so internal package dependencies are built, packed, smoke-installed, and dry-run published before packages that consume them.

## Release Flow

Use Changesets to record public package changes and update versions:

```bash
pnpm changeset
pnpm version-packages
pnpm release:check
pnpm smoke:core-install
pnpm release:publish:dry-run
pnpm release:publish
```

`pnpm release:publish:dry-run` runs the full release check first, smoke-installs the packed tarballs, then dry-runs
publishing those exact verified tarballs. It does not publish packages.

`pnpm release:publish` publishes those same artifacts in dependency order, skips package versions that already exist on
the configured npm endpoint, and then creates Changesets git tags for the published package versions.

GitHub release automation starts only after CI succeeds for the same current `main` commit. When pending changesets
exist, it opens or updates a version PR. When the version PR is merged, it runs `pnpm release:publish:dry-run` and then
`pnpm release:publish`. This requires an `NPM_TOKEN` repository secret with publish access for the `@a3s-lab` scope.

CI checks pull requests with `pnpm changeset status --since=origin/<base-branch>` so publishable core package changes must include a changeset or an explicit empty changeset. Changesets-generated version PRs are skipped for that status check because they already consume the pending changesets into package versions and changelogs.
