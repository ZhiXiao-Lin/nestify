# Nestify

Nestify is a pnpm workspace for reusable NestJS backend API packages built around Domain-Driven Design. The repository keeps generic API framework capabilities in `packages/*` and includes a small order API under `apps/api` to show how those packages are composed in a real service.

The first rule of this repository is separation:

- Framework packages contain generic API building blocks.
- The sample API owns business rules, DTOs, database schema types, route choices, and environment values.
- Cross-cutting behavior moves into packages only when it can stay useful outside the sample API.

## What Is Included

Nestify currently contains 18 publishable framework packages:

| Package | Responsibility |
| --- | --- |
| `@a3s-lab/ddd` | Framework-independent DDD primitives with validated entity identities, structural immutable value objects, read-only aggregate event snapshots, defensive audit timestamps, finite guards, and explicit `Result` states. |
| `@a3s-lab/cqrs` | NestJS CQRS adapter for publishing `@a3s-lab/ddd` domain events through the Nest event bus. |
| `@a3s-lab/http` | Bounded API envelopes, business errors, strict validation, safe request ids, pagination, DTO serialization, collision-safe key transforms, configurable error handling/API versioning, and OpenAPI helpers. |
| `@a3s-lab/security` | Default-deny guard primitives, public/role/permission metadata, local/dev guard helpers, path validation, sensitive operation metadata, JWT helpers, and role-permission checks. |
| `@a3s-lab/observability` | Request tracking, privacy-aware bounded SQL/external-call collectors, cardinality-safe Prometheus metrics, reactive HTTP instrumentation, and timeout-bound dependency-aware health checks. |
| `@a3s-lab/logger` | Pino structured logging with default secret redaction, isolated async request context, bounded HTTP metadata, and a NestJS request interceptor. |
| `@a3s-lab/kysely` | Validated NestJS lifecycle integration for Kysely, PostgreSQL pool builders, external-instance ownership, and bounded SQL diagnostics. |
| `@a3s-lab/redisson` | Lifecycle-safe Redis caching and lock helpers with local single-flight loads, managed lock ownership, cluster-aware SCAN/UNLINK cleanup, validated options, and bounded shutdown. |
| `@a3s-lab/resilience` | Validated, cancellation-aware retry; concurrency-safe circuit breaking; single-flight cache; bounded sliding-window rate limiting; and ownership-safe distributed locks. |
| `@a3s-lab/bullmq` | Lifecycle-safe NestJS BullMQ module with SDK-typed options, multi-worker management, queue metrics, health checks, bounded shutdown, and explicit cleanup helpers. |
| `@a3s-lab/nats` | Lifecycle-safe NATS messaging with validated SDK options, connection single-flight, request-many helpers, owned subscriptions, JetStream acknowledgement policy, active health probes, and bounded shutdown. |
| `@a3s-lab/rustfs` | NestJS S3-compatible object storage with method-correct signed URLs, policy-backed POST forms, multipart uploads, health checks, and graceful client shutdown. |
| `@a3s-lab/etcd` | NestJS etcd module with key-value operations, coherent bounded config caching, shared watches, leases, compare-and-set, retries, health checks, and failure-isolated cleanup. |
| `@a3s-lab/clickhouse` | Validated official ClickHouse client integration with cancellable requests, typed query/insert helpers, bounded database-client pooling, health reporting, and deterministic shutdown. |
| `@a3s-lab/migrations` | Validated Kysely migration lifecycle, sync/async NestJS registration, fail-closed startup policy, and named non-transactional operations. |
| `@a3s-lab/files` | Safe object-key validation, bounded and compensating batch uploads, route policies, request parameter decorators, and NestJS upload interceptors. |
| `@a3s-lab/ai` | Strict NestJS lifecycle integration for `@a3s-lab/code`, including lazy validated loading, standard/named/worker sessions, disposable runs and streams, cancellation, and race-safe shutdown. |
| `@a3s-lab/sandbox` | NestJS integration for the first-party `@a3s-lab/box` SDK with native instances, guarded connection configuration, managed scopes, and bounded observable shutdown. |

The shared package list is dependency-ordered in `scripts/core-packages.mjs`. Build, test, pack, smoke install, and publish rehearsal commands all use that same list.

## Repository Layout

```text
.
├── apps/
│   └── api/                  # Sample NestJS API using selected framework packages
├── packages/                 # Reusable backend API packages
├── docs/
│   ├── architecture.md       # Sample API architecture notes
│   ├── ddd-patterns.md       # DDD examples used by the sample API
│   └── framework-core.md     # Package boundaries, verification, and release notes
├── scripts/                  # Core package verification, smoke install, and publish scripts
├── docker/                   # Local Docker setup for PostgreSQL, Redis, and the sample API
└── package.json              # Workspace scripts
```

Each package also has its own README with install notes, examples, exports, and package boundaries.

## Sample API

`apps/api` is a reference NestJS API, not the framework itself. It demonstrates:

- DDD layers inside an order bounded context
- Nest CQRS commands, queries, and domain event handlers
- Kysely/PostgreSQL persistence
- Redisson/Redis-backed cache wiring
- Health, metrics, request tracking, validation, response wrapping, serialization, file upload, and error handling through framework packages

The API entry point sets the global prefix to `/api` and exposes Swagger at `/api/docs`. The order controller provides:

```text
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
POST /api/orders/:id/confirm
POST /api/orders/:id/cancel
```

When observability modules are registered, health and metrics routes are available under the same global prefix:

```text
GET /api/health
GET /api/health/live
GET /api/health/ready
GET /api/metrics
GET /api/metrics/json
```

## Requirements

- Node.js 20.18.1, or Node.js 22+
- pnpm 10.30.3
- TypeScript 5.7.2 or newer
- Docker and Docker Compose for the local PostgreSQL and Redis setup

The published NestJS integration packages accept NestJS 10 and 11 peers. The workspace and sample API are built and tested against NestJS 11 and Express 5.

## Quick Start

```bash
git clone https://github.com/A3S-Lab/nestify.git
cd nestify
pnpm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres redis
pnpm build
pnpm start:dev
```

Open:

- Base URL: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Metrics: `http://localhost:3000/api/metrics`

You can also start the Docker development service:

```bash
docker compose -f docker/docker-compose.yml up app
```

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build every workspace project. |
| `pnpm build:api` | Build only the sample API. |
| `pnpm build:core` | Build all framework packages from the shared core package list. |
| `pnpm test` | Run all workspace tests. |
| `pnpm test:core` | Run framework package tests from the shared core package list. |
| `pnpm lint:check` | Check Biome lint rules. |
| `pnpm format:check` | Check Biome formatting. |
| `pnpm release:check` | Format, lint, build, test, pack, and verify every framework package. |
| `pnpm smoke:core-install` | Install packed framework package tarballs in a temporary consumer project, type-check imports, and run a Node import smoke test. |
| `pnpm release:publish:dry-run` | Run the full release check, smoke install, and dry-run publishing of the verified package tarballs. |

## Package Verification

`pnpm release:check` is the main local confidence command for package work. It verifies:

- package metadata required for publishing
- public entry points and type declarations
- README presence and required sections
- tarball contents
- absence of source files, tests, and build cache files in tarballs
- dependency order for internal `@a3s-lab/*` package dependencies
- workspace dependency rewriting in packed manifests

`pnpm release:publish:dry-run` runs `release:check`, `smoke:core-install`, and dry-run publishing against the exact
tarballs that passed verification. The real publish command uploads those same artifacts rather than rebuilding from
the source directories.

## Versioning And Publishing

Public package changes should be recorded with Changesets:

```bash
pnpm changeset
pnpm version-packages
pnpm release:publish:dry-run
pnpm release:publish
```

`pnpm release:publish` publishes the verified shared-core tarballs in dependency order, skips package versions that
already exist on the configured npm endpoint, and then creates Changesets git tags.

CI checks pull requests with `pnpm changeset status --since=origin/<base-branch>`, except Changesets-generated version
PRs. Release automation starts only after the CI workflow succeeds for the same current `main` commit; it opens or
updates a version PR when changesets are pending, and publishes after that version PR is merged. Publishing requires
an `NPM_TOKEN` secret with access to the `@a3s-lab` scope.

## Runtime Safety Defaults

- DDD entities reject missing identities and compare only within the same concrete type. Value objects take bounded,
  acyclic deep snapshots; aggregate event queues and audit/event timestamps cannot be mutated through public accessors.
- `SecurityModule.register()` installs the default-deny guard globally. Only `@Public()` routes bypass authentication;
  protected routes require an explicit delegate unless the application deliberately disables global installation.
- Resilience policies validate timing, capacity, key, and identity inputs. Retry backoff is cancellable; half-open
  circuit probes are concurrency-bounded; cache misses are coalesced without stale-write races; lock cleanup failures
  remain observable; and the atomic rate limiter bounds both Redis and local-fallback cardinality.
- Observability collectors default to normalized SQL and omit parameters plus detailed failures. Raw SQL, parameters,
  and error details require explicit opt-in; collector counts, serialized values, and request identity fields are bounded.
- HTTP metrics start at Observable subscription, bypass non-HTTP transports, use route templates rather than raw URLs,
  and cap metric count, label count/value size, histogram buckets, and series cardinality. Prometheus metadata is escaped.
- Health probes have validated unique names, bounded liveness payloads, a default five-second timeout with cooperative
  cancellation, private failure details, and explicit Nest module imports for injected dependencies.
- Logger request context is scoped to each Observable subscription; inbound ids and optional headers are bounded, query
  strings are excluded, proxy identity follows Express trust-proxy policy, and common secrets are redacted by default.
- Kysely configuration and PostgreSQL numeric options are validated before connection creation. Module-owned connections
  close idempotently, external instances stay caller-owned, and SQL diagnostics omit parameters and stacks by default.
- HTTP request and correlation IDs are syntax- and length-checked before reuse, logs omit query strings, generic 5xx
  responses hide internal messages by default, and public error details and key transforms have depth/entry limits.
- Startup database migrations remain disabled in every environment unless the application explicitly opts in.
  Configuration is validated before bootstrap, concurrent calls on one runner share their in-flight result, and
  Kysely's database lock coordinates separate instances.
- ClickHouse database overrides use a bounded LRU client pool. New work is rejected during shutdown, request signals are
  combined with timeouts, and failed eviction never silently grows the pool.
- BullMQ preserves queue-level retry defaults, rejects new work during teardown, closes owned workers before queues under
  one total timeout, and labels job-removal operations as destructive rather than implying that `drain` processes jobs.
- Sandbox shutdown rejects new work, drains complete managed callback and connection scopes, applies a 30-second
  default bound, settles every owned instance, and reports final cleanup failures without discarding retry ownership.
- AI module options and native SDK contracts fail fast at the Nest boundary. Disposable AI sessions preserve operation
  and cleanup failures together, support request-scoped aborts, and session construction is drained before Agent
  shutdown.

## Design Boundaries

Use these rules when moving code from the sample API into packages:

- Keep package names short and capability-based.
- Keep `@a3s-lab/ddd` independent of NestJS and transport concerns.
- Put NestJS integration only in packages that need Nest providers, modules, decorators, guards, filters, or interceptors.
- Keep business entities, sample DTOs, route-specific messages, environment variable names, database schema types, and default business policy in the consuming API.
- Prefer a package abstraction only when there is a stable contract that can be reused by another backend API.

See [Framework Core](docs/framework-core.md) for the detailed extraction audit and package boundary notes.

## More Documentation

- [Framework Core](docs/framework-core.md): package responsibilities, extraction decisions, verification, and release flow
- [Architecture](docs/architecture.md): sample API architecture
- [DDD Patterns](docs/ddd-patterns.md): DDD patterns used by the sample API

## License

MIT
