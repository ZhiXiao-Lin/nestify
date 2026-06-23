# Nestify - DDD Backend API Framework

Nestify is a reusable NestJS framework workspace for backend APIs built with Domain-Driven Design (DDD), Clean Architecture, and capability-based packages. The repository also includes a sample order API that shows how the framework packages compose in a real NestJS application.

## Features

### Core Architecture
- **Framework Workspace**: pnpm workspace for reusable backend API packages and the sample API
- **Reusable API Framework Core**: Capability-based packages for DDD, HTTP contracts, security, observability, resilience, analytics, migrations, and files
- **Clean Architecture**: Clear separation of concerns with Domain, Application, Infrastructure, and Presentation layers
- **Domain-Driven Design**: Rich domain models with entities, value objects, aggregates, and domain events
- **CQRS Pattern**: Separate command and query handlers using @nestjs/cqrs
- **Event-Driven**: Domain events for decoupled communication

### API Infrastructure Packages
- **Type-Safe SQL**: Kysely query builder with full TypeScript support
- **Distributed Caching**: Redis with Redisson for locks, caching, and rate limiting
- **Structured Logging**: Pino-based JSON logging with request tracing
- **Message Queue**: BullMQ for distributed task processing
- **Event Streaming**: NATS with JetStream support
- **Object Storage**: S3-compatible RustFS storage
- **Distributed Config**: etcd for configuration management with hot-reload

### API Framework Capabilities
- **Security Primitives**: JWT helpers, RBAC checks, and route metadata through `@a3s-lab/security`
- **API Metrics**: Prometheus metrics with request tracking
- **Circuit Breaker**: Fault tolerance with automatic failover
- **Retry Logic**: Exponential backoff with jitter
- **Rate Limiting**: Redis-based sliding window rate limiting
- **API Versioning**: Header-based API versioning
- **File Upload**: Multipart file handling

### Quality Assurance
- **Type Safety**: Full TypeScript with strict mode
- **API Documentation**: Swagger/OpenAPI integration
- **Validation**: class-validator with custom decorators
- **Testing**: Unit, integration, and E2E test setup
- **Code Quality**: Biome linting and formatting

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Sample API Application                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Presentation    │  Application    │  Domain      │  Infrastructure         │
│  - Controllers   │  - Commands     │  - Entities  │  - Kysely (PostgreSQL) │
│  - DTOs          │  - Queries      │  - Value Obj │  - Redisson (Redis)    │
│  - Guards        │  - Event Hand. │  - Aggreg.   │  - BullMQ (Tasks)       │
│  - Interceptors  │  - DTOs        │  - Events    │  - NATS (Messaging)     │
│                  │                 │  - Services   │  - RustFS (Storage)     │
│                  │                 │              │  - etcd (Config)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Reusable Framework Packages                         │
│  DDD │ HTTP │ Security │ Observability │ Resilience │ Files │ Health      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
nestify/
├── pnpm-workspace.yaml              # Workspace configuration
├── package.json                     # Root package.json with workspace scripts
├── tsconfig.json                   # Base TypeScript configuration
├── biome.json                      # Biome linting/formatting config
├── apps/
│   └── api/                       # Sample NestJS API application
│       ├── src/
│       │   ├── app.module.ts      # Root application module
│       │   ├── main.ts            # Application entry point
│       │   └── modules/          # Business modules (DDD)
│       └── package.json
└── packages/
    ├── kysely/                    # @a3s-lab/kysely - Type-safe SQL
    ├── redisson/                  # @a3s-lab/redisson - Redis client
    ├── ddd/                       # @a3s-lab/ddd - DDD primitives
    ├── cqrs/                      # @a3s-lab/cqrs - Nest CQRS adapters
    ├── http/                      # @a3s-lab/http - API contracts
    ├── security/                  # @a3s-lab/security - API security primitives
    ├── observability/             # @a3s-lab/observability - Tracking and metrics
    ├── resilience/                # @a3s-lab/resilience - Retry, cache, circuit breaker
    ├── clickhouse/                # @a3s-lab/clickhouse - ClickHouse client module
    ├── migrations/                # @a3s-lab/migrations - Kysely migration helpers
    ├── files/                     # @a3s-lab/files - File upload contracts
    ├── logger/                    # @a3s-lab/logger - Structured logging
    ├── bullmq/                    # @a3s-lab/bullmq - Task queue
    ├── nats/                      # @a3s-lab/nats - Message broker
    ├── rustfs/                    # @a3s-lab/rustfs - S3 storage
    └── etcd/                      # @a3s-lab/etcd - Config center
```

## Packages

See [Framework Core](docs/framework-core.md) for the reusable DDD/API packages extracted from the application shared layer. Each core package has its own README with install notes, import examples, exported capabilities, and package boundaries.

### @a3s-lab/ddd

Framework-independent DDD primitives and persistence contracts.

```typescript
class Order extends AggregateRoot<string> {
    confirm() {
        this.addDomainEvent(new OrderConfirmedEvent(this.id));
    }
}

const result = Guard.againstNullOrUndefined(orderId, 'orderId');
```

### @a3s-lab/cqrs

Nest CQRS adapters for DDD domain event publishing.

```typescript
{
    provide: DOMAIN_EVENT_PUBLISHER,
    useClass: NestCqrsDomainEventPublisher,
}
```

### @a3s-lab/http

API envelopes, errors, validation, pagination, request ids, DTO serialization, response/key transforms, presentation filters/interceptors, and OpenAPI helpers.

```typescript
throw new BusinessException({
    code: StatusCode.BUSINESS_RULE_VIOLATION,
    message: 'Order cannot be confirmed',
});
```

### @a3s-lab/security

Default-deny guard primitives, JWT helpers, role-permission checks, and reusable API security helpers.

```typescript
@Public()
@Get('health')
health() {
    return { ok: true };
}
```

### @a3s-lab/observability

Request tracking, SQL/external-call collectors, and Prometheus-style metrics.

```typescript
const requestId = getRequestId();
recordExternalCall({ kind: 'http', target: 'external-service', op: 'POST /events', durationMs });
```

### @a3s-lab/resilience

Retry, circuit breaker, cache, rate limiting, and distributed lock utilities.

```typescript
const value = await retryService.executeOrThrow(fetchRemote, {
    maxAttempts: 3,
    initialDelay: 100,
});
```

### @a3s-lab/clickhouse

NestJS wrapper for the official ClickHouse client.

```typescript
const result = await clickhouse.queryJson<{ id: string }>('select id from events limit 10');
```

### @a3s-lab/migrations

Kysely migration helpers with support for non-transactional concurrent migrations.

```typescript
MigrationModule.register({
    migrationFolder: path.join(__dirname, 'migrations'),
    autoRun: true,
});
```

### @a3s-lab/files

File upload validation, storage client contracts, and NestJS upload interceptors.

```typescript
FileUploadModule.register({
    keyPrefix: 'uploads',
    signedUrlExpiresInSeconds: 900,
});
```

### @a3s-lab/kysely

Type-safe SQL query builder module for NestJS.

```typescript
KyselyModule.register({
  config: {
    dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }),
  },
})
```

### @a3s-lab/redisson

Redis distributed locks, caching, and rate limiting.

```typescript
// Distributed lock
await redisson.withLock('resource-key', async () => {
  // Critical section
});

// Cache with TTL
await redisson.setJSON('cache-key', data, 3600);

// Rate limiting
const limited = await rateLimiter.tryAcquire('endpoint-limit');
```

### @a3s-lab/logger

Structured JSON logging with request tracing.

```typescript
LoggerModule.register({
  level: 'info',
  name: 'api',
  json: true,  // JSON format for K8s
});

// In services
logger.logRequest({ method, url, statusCode, responseTime });
```

### @a3s-lab/bullmq

Distributed task queue with retry and delayed jobs.

```typescript
// Add job
await bullmq.addJob('tasks', 'process-resource', { resourceId: 'resource-1' });

// Create worker
bullmq.createWorker('tasks', async (job) => {
  await processResource(job.data);
  return { success: true };
});
```

### @a3s-lab/nats

High-performance message broker with JetStream.

```typescript
// Publish
await nats.publish({ subject: 'resources.changed', data: resourceEvent });

// Subscribe
await nats.subscribe$('resources.changed', async (data) => {
  await handleResourceChanged(data);
});

// JetStream
await nats.jsPublish({ stream: 'RESOURCE_EVENTS', subject: 'resources.changed', data: resourceEvent });
```

### @a3s-lab/rustfs

S3-compatible object storage.

```typescript
// Upload file
const result = await rustfs.putObject('bucket', {
  key: 'uploads/file.pdf',
  body: fileBuffer,
  contentType: 'application/pdf',
});

// Get presigned URL
const url = await rustfs.getPresignedUrl('bucket', {
  key: 'uploads/file.pdf',
  expiresIn: 3600,
});
```

### @a3s-lab/etcd

Distributed configuration with hot-reload.

```typescript
// Get config
const value = await etcd.get('settings/api');

// Watch for changes
etcd.watch('settings/api', (event) => {
  if (event.value) applySettings(event.value);
});
```

## API Wiring

Reusable API capabilities are exposed through packages such as `@a3s-lab/http`, `@a3s-lab/security`, `@a3s-lab/observability`, and `@a3s-lab/resilience`. The sample API imports only the package modules it wires from `apps/api/src/app.module.ts`; order-specific database schema types stay inside the order persistence adapter.

```typescript
GET /health       // Full health check
GET /health/live  // Liveness probe
GET /health/ready // Readiness probe
```

## Project Structure

```
apps/api/src/
├── app.module.ts                    # Root module
├── main.ts                         # Bootstrap
├── modules/                         # Business modules
│   └── order/                      # Order bounded context
│       ├── domain/
│       │   ├── entities/          # Order, OrderItem
│       │   ├── value-objects/    # Money, Quantity
│       │   ├── events/           # OrderCreated, OrderConfirmed
│       │   ├── repositories/     # IOrderRepository
│       │   └── exceptions/      # Domain exceptions
│       ├── application/
│       │   ├── commands/        # CreateOrder, CancelOrder
│       │   ├── queries/        # GetOrder, ListOrders
│       │   └── event-handlers/ # HandleOrderCreated
│       ├── infrastructure/
│       │   └── persistence/     # KyselyOrderRepository and schema types
│       └── presentation/
│           └── order.controller.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone and install
git clone https://github.com/A3S-Lab/nestify.git
cd nestify
pnpm install

# Start infrastructure
cd docker && docker-compose up -d

# Build
pnpm build

# Run
pnpm start:dev
```

Access:
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Metrics: http://localhost:3000/metrics

## Scripts

```bash
pnpm install              # Install dependencies
pnpm build               # Build all
pnpm start:dev           # Development mode
pnpm test                # Run tests
pnpm lint                # Lint code
pnpm format             # Format code
```

## Key Design Patterns

### Domain-Driven Design

```
Domain Layer (innermost, no dependencies)
    │
    ▼
Application Layer (depends on Domain)
    │
    ▼
Infrastructure Layer (implements interfaces)
    │
    ▼
Presentation Layer (depends on all)
```

### CQRS

- **Commands**: `CreateOrder`, `ConfirmOrder` - Write operations
- **Queries**: `GetOrder`, `ListOrders` - Read operations
- **Events**: `OrderCreated`, `OrderConfirmed` - Decoupled communication

### Fault Tolerance

```
Circuit Breaker States:
┌─────────┐     5 failures      ┌──────┐     timeout     ┌───────────┐
│ CLOSED │ ─────────────────▶  │ OPEN │ ──────────────▶ │ HALF_OPEN │
└─────────┘                     └──────┘                 └───────────┘
     ▲                                                        │
     │            success                                     │
     └────────────────────────────────────────────────────────┘
```

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestify

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=0
```

## License

MIT
