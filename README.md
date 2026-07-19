# Nestify

Nestify is a pnpm workspace for reusable NestJS backend API packages built around Domain-Driven Design. The repository keeps generic API framework capabilities in `packages/*` and includes a small order API under `apps/api` to show how those packages are composed in a real service.

The first rule of this repository is separation:

- Framework packages contain generic API building blocks.
- The sample API owns business rules, DTOs, database schema types, route choices, and environment values.
- Cross-cutting behavior moves into packages only when it can stay useful outside the sample API.

## What Is Included

Nestify currently contains 16 publishable framework packages:

| Package | Responsibility |
| --- | --- |
| `@a3s-lab/ddd` | Framework-independent DDD primitives: entities, aggregate roots, value objects, domain events, repositories, unit of work contracts, guards, and `Result`. |
| `@a3s-lab/cqrs` | NestJS CQRS adapter for publishing `@a3s-lab/ddd` domain events through the Nest event bus. |
| `@a3s-lab/http` | API envelopes, business errors, validation, request ids, pagination, DTO serialization, key transforms, filters, interceptors, API versioning, and OpenAPI helpers. |
| `@a3s-lab/security` | Default-deny guard primitives, public/role/permission metadata, local/dev guard helpers, path validation, sensitive operation metadata, JWT helpers, and role-permission checks. |
| `@a3s-lab/observability` | Request tracking context, SQL and external-call collectors, metrics service, Prometheus output, HTTP metrics interceptor, and health check module. |
| `@a3s-lab/logger` | Structured logging service, async request context, and request logging interceptor for NestJS APIs. |
| `@a3s-lab/kysely` | NestJS Kysely module, query logging, and PostgreSQL option builders. |
| `@a3s-lab/redisson` | NestJS Redisson module, Redis service helpers, single-node Redis option builders, and public Redis/Redisson API re-exports. |
| `@a3s-lab/resilience` | Retry, circuit breaker, cache, rate limiting, distributed lock decorators, services, guards, and interceptors. |
| `@a3s-lab/bullmq` | NestJS BullMQ module, queue service helpers, worker lifecycle, queue metrics, and cleanup helpers. |
| `@a3s-lab/nats` | NestJS NATS module, publish/subscribe, request/reply, JetStream helpers, connection state, and lifecycle cleanup. |
| `@a3s-lab/rustfs` | NestJS S3-compatible object storage module, bucket operations, object operations, presigned URLs, multipart uploads, and health checks. |
| `@a3s-lab/etcd` | NestJS etcd module, key-value operations, JSON config helpers, local caching, watches, leases, compare-and-set, and health checks. |
| `@a3s-lab/clickhouse` | NestJS module and service wrapper around the official ClickHouse JavaScript client. |
| `@a3s-lab/migrations` | Kysely migration helpers, auto-run NestJS module integration, and concurrent-safe non-transactional migration support. |
| `@a3s-lab/files` | File upload validation, storage client contracts, upload decorators, and NestJS upload interceptors. |

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
- Health, metrics, request tracking, validation, response wrapping, transforms, file upload, and error handling through framework packages

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

- Node.js 20.11+
- pnpm 10.30.3
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
| `pnpm release:publish:dry-run` | Run the full release check, smoke install, and per-package `pnpm publish --dry-run`. |

## Package Verification

`pnpm release:check` is the main local confidence command for package work. It verifies:

- package metadata required for publishing
- public entry points and type declarations
- README presence and required sections
- tarball contents
- absence of source files, tests, and build cache files in tarballs
- dependency order for internal `@a3s-lab/*` package dependencies
- workspace dependency rewriting in packed manifests

`pnpm release:publish:dry-run` runs `release:check`, `smoke:core-install`, and the package publish lifecycle scripts without publishing packages.

## Versioning And Publishing

Public package changes should be recorded with Changesets:

```bash
pnpm changeset
pnpm version-packages
pnpm release:publish:dry-run
pnpm release:publish
```

`pnpm release:publish` publishes the shared core package list in dependency order, skips package versions that already exist on the configured npm endpoint, and then creates Changesets git tags.

CI checks pull requests with `pnpm changeset status --since=origin/<base-branch>`, except Changesets-generated version PRs. Release automation runs on pushes to `main`; it opens or updates a version PR when changesets are pending, and publishes after that version PR is merged. Publishing requires an `NPM_TOKEN` secret with access to the `@a3s-lab` scope.

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
