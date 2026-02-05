# Nestify - NestJS Monorepo Template

A production-ready NestJS monorepo template with pnpm workspace, implementing Domain-Driven Design (DDD) and Clean Architecture principles.

## Features

- **Monorepo Architecture**: pnpm workspace for managing multiple packages and applications
- **Custom NestJS Packages**: Reusable @a3s-lab scoped packages (kysely, etc.)
- **Clean Architecture**: Clear separation of concerns with Domain, Application, Infrastructure, and Presentation layers
- **Domain-Driven Design**: Rich domain models with entities, value objects, aggregates, and domain events
- **CQRS Pattern**: Separate command and query handlers using @nestjs/cqrs
- **Event-Driven**: Domain events for decoupled communication
- **Type Safety**: Full TypeScript with strict mode enabled
- **Type-Safe SQL**: Kysely query builder with full TypeScript support
- **API Documentation**: Swagger/OpenAPI integration
- **Validation**: Request validation with class-validator
- **Docker**: Development and production Docker configurations
- **Testing**: Unit, integration, and E2E test setup

## Monorepo Structure

```
nestify/
├── pnpm-workspace.yaml          # Workspace configuration
├── package.json                 # Root package.json with workspace scripts
├── apps/
│   └── api/                     # Main NestJS API application
│       ├── src/
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
└── packages/
    ├── kysely/                  # @a3s-lab/kysely - Type-safe SQL query builder
    │   ├── src/
    │   ├── package.json
    │   └── tsconfig.json
    └── redisson/                # @a3s-lab/redisson - Redis distributed locks & caching
        ├── src/
        ├── package.json
        └── tsconfig.json
```

## Packages

### @a3s-lab/kysely

Type-safe SQL query builder module for NestJS with Kysely integration.

**Installation:**
```bash
pnpm add @a3s-lab/kysely
```

**Usage:**
```typescript
import { Module } from '@nestjs/common';
import { KyselyModule } from '@a3s-lab/kysely';
import { PostgresDialect } from 'kysely';
import { Pool } from 'pg';

@Module({
  imports: [
    KyselyModule.register({
      config: {
        dialect: new PostgresDialect({
          pool: new Pool({
            connectionString: process.env.DATABASE_URL,
          }),
        }),
      },
    }),
  ],
})
export class AppModule {}
```

**Async Configuration:**
```typescript
KyselyModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    config: {
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: config.get('DATABASE_URL'),
        }),
      }),
    },
  }),
  inject: [ConfigService],
})
```

**Using KyselyService:**
```typescript
import { Injectable } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { Database } from './database.types';

@Injectable()
export class UserRepository {
  constructor(private readonly db: KyselyService<Database>) {}

  async findById(id: string) {
    return this.db
      .selectFrom('users')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }
}
```

### @a3s-lab/redisson

Redis distributed locks and caching module for NestJS with Redisson integration.

**Installation:**
```bash
pnpm add @a3s-lab/redisson
```

**Usage:**
```typescript
import { Module } from '@nestjs/common';
import { RedissonModule } from '@a3s-lab/redisson';

@Module({
  imports: [
    RedissonModule.register({
      redis: {
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
    }),
  ],
})
export class AppModule {}
```

**Async Configuration:**
```typescript
RedissonModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    redis: {
      options: {
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD'),
      },
    },
  }),
  inject: [ConfigService],
})
```

**Using RedissonService:**
```typescript
import { Injectable } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

@Injectable()
export class CacheService {
  constructor(private readonly redisson: RedissonService) {}

  // Cache with TTL
  async cacheData(key: string, data: any, ttl: number = 3600) {
    await this.redisson.setJSON(key, data, ttl);
  }

  // Get cached data
  async getCachedData<T>(key: string): Promise<T | null> {
    return this.redisson.getJSON<T>(key);
  }

  // Distributed lock
  async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    return this.redisson.withLock(key, operation, 5000, 10000);
  }

  // Counter
  async incrementCounter(key: string): Promise<number> {
    return this.redisson.increment(key);
  }
}
```

## Architecture

This template follows Clean Architecture principles with four main layers:

### 1. Domain Layer (Core Business Logic)
- **Entities**: Business objects with identity (Order, OrderItem)
- **Value Objects**: Immutable objects without identity (Money, Quantity, OrderStatus)
- **Aggregates**: Clusters of entities and value objects (Order as aggregate root)
- **Domain Events**: Events that represent business occurrences
- **Domain Services**: Business logic that doesn't belong to a single entity
- **Repository Interfaces**: Contracts for data persistence

### 2. Application Layer (Use Cases)
- **Commands**: Write operations (CreateOrder, ConfirmOrder, CancelOrder)
- **Queries**: Read operations (GetOrder, ListOrders)
- **DTOs**: Data transfer objects for API contracts
- **Event Handlers**: React to domain events
- **CQRS**: Separate read and write models

### 3. Infrastructure Layer (Technical Concerns)
- **Persistence**: Kysely repositories and database schemas
- **Caching**: Redis caching with Redisson
- **Messaging**: Event bus implementation
- **External Services**: Third-party integrations
- **Configuration**: Environment and database setup

### 4. Presentation Layer (API)
- **Controllers**: REST API endpoints
- **Filters**: Exception handling
- **Interceptors**: Logging and transformation
- **Validation**: Request validation

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+ (install with `npm install -g pnpm`)
- Docker and Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nestify
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start PostgreSQL with Docker:
```bash
cd docker
docker-compose up -d postgres
```

5. Build packages:
```bash
pnpm build:packages
```

6. Run the application:
```bash
pnpm start:dev
```

The application will be available at:
- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs

## Project Structure

```
nestify/
├── apps/
│   └── api/                         # Main API application
│       └── src/
│           ├── shared/              # Shared kernel
│           │   ├── domain/          # Base domain classes
│           │   ├── application/     # Base application interfaces
│           │   ├── infrastructure/  # Base infrastructure
│           │   ├── presentation/    # Filters, interceptors
│           │   └── utils/           # Utilities
│           └── modules/
│               └── order/           # Order bounded context
│                   ├── domain/      # Domain layer
│                   │   ├── entities/
│                   │   ├── value-objects/
│                   │   ├── events/
│                   │   ├── repositories/
│                   │   ├── services/
│                   │   └── exceptions/
│                   ├── application/ # Application layer
│                   │   ├── commands/
│                   │   ├── queries/
│                   │   └── event-handlers/
│                   ├── infrastructure/  # Infrastructure layer
│                   │   └── persistence/
│                   └── presentation/    # Presentation layer
│                       └── order.controller.ts
└── packages/
    ├── kysely/                      # @a3s-lab/kysely package
    │   └── src/
    │       ├── kysely.module.ts
    │       ├── kysely.service.ts
    │       ├── kysely.logger.ts
    │       └── index.ts
    └── redisson/                    # @a3s-lab/redisson package
        └── src/
            ├── redisson.module.ts
            ├── redisson.service.ts
            ├── types.ts
            └── index.ts
```

## API Endpoints

### Orders

- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders?customerId=xxx` - List orders by customer
- `POST /api/orders/:id/confirm` - Confirm an order
- `POST /api/orders/:id/cancel` - Cancel an order

### Example: Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      {
        "productId": "product-456",
        "quantity": 2,
        "unitPrice": 10.99
      }
    ]
  }'
```

## Scripts

```bash
# Workspace Management
pnpm install              # Install all dependencies
pnpm build                # Build all packages and apps
pnpm build:packages       # Build only packages
pnpm build:api            # Build only API app
pnpm clean                # Clean all node_modules and dist

# Development
pnpm start:dev            # Start API in watch mode
pnpm start:debug          # Start API in debug mode

# Build
pnpm build                # Build all packages and apps

# Testing
pnpm test                 # Run all tests
pnpm test:api             # Run API tests

# Linting
pnpm lint                 # Lint and fix
pnpm format               # Format code

# Package-specific commands
pnpm --filter @a3s-lab/kysely build    # Build kysely package
pnpm --filter @a3s-lab/redisson build  # Build redisson package
pnpm --filter @a3s-lab/api test        # Test API app
```

## Docker

### Development
```bash
cd docker
docker-compose up
```

### Production
```bash
docker build -f docker/Dockerfile -t nest-ddd .
docker run -p 3000:3000 nest-ddd
```

## Testing

The template includes examples for:
- Unit tests for domain entities and value objects
- Integration tests for repositories
- E2E tests for API endpoints

Run tests:
```bash
pnpm test                 # All tests
pnpm test:api             # API tests only
pnpm --filter @a3s-lab/api test:cov  # Coverage report
```

## Creating New Packages

To create a new custom NestJS package:

1. Create package directory:
```bash
mkdir -p packages/my-package/src
```

2. Create package.json:
```json
{
  "name": "@a3s-lab/my-package",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0"
  }
}
```

3. Create tsconfig.json following the kysely package pattern

4. Build and use:
```bash
pnpm build:packages
# Use in apps with: import { ... } from '@a3s-lab/my-package'
```

## Documentation

- [Architecture Guide](docs/architecture.md) - Detailed architecture explanation
- [DDD Patterns](docs/ddd-patterns.md) - DDD patterns used in this template
- [Adding Features](docs/adding-features.md) - How to add new features
- [Database Setup](apps/api/DATABASE.md) - PostgreSQL and Kysely setup
- [Redis Usage](apps/api/REDIS_USAGE.md) - Redis and Redisson usage guide

## Key Design Patterns

### Domain-Driven Design
- **Entities**: Objects with identity and lifecycle
- **Value Objects**: Immutable objects defined by their attributes
- **Aggregates**: Consistency boundaries with a root entity
- **Domain Events**: Capture business occurrences
- **Repositories**: Abstract data access

### CQRS (Command Query Responsibility Segregation)
- Separate models for reads and writes
- Commands change state, queries return data
- Event-driven communication

### Clean Architecture
- Dependency rule: inner layers don't depend on outer layers
- Domain layer is independent of frameworks
- Infrastructure depends on domain, not vice versa

## Best Practices

1. **Domain First**: Start with domain modeling before infrastructure
2. **Immutability**: Use value objects for immutable concepts
3. **Encapsulation**: Keep business logic in domain entities
4. **Events**: Use domain events for side effects
5. **Testing**: Write tests for domain logic first
6. **Validation**: Validate at boundaries (DTOs, value objects)

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines first.
