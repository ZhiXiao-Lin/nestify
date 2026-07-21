# Architecture Guide

## Overview

This sample API implements Clean Architecture and Domain-Driven Design (DDD) principles to create a maintainable, testable, and scalable backend structure.

## The Dependency Rule

The fundamental rule of Clean Architecture:

> Source code dependencies must point only inward, toward higher-level policies.

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│         (Controllers, DTOs)             │
└──────────────┬──────────────────────────┘
               │ depends on
┌──────────────▼──────────────────────────┐
│         Application Layer               │
│    (Commands, Queries, Handlers)        │
└──────────────┬──────────────────────────┘
               │ depends on
┌──────────────▼──────────────────────────┐
│           Domain Layer                  │
│  (Entities, Value Objects, Events)      │
└─────────────────────────────────────────┘
               ▲
               │ implements
┌──────────────┴──────────────────────────┐
│       Infrastructure Layer              │
│  (Repositories, Database, External)     │
└─────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Domain Layer (Core)

**Purpose**: Contains business logic and rules. This is the heart of the application.

**Components**:
- **Entities**: Objects with identity that persist over time
  - Example: `Order`, `OrderItem`
  - Have unique identifiers
  - Contain business logic
  - Can change state through methods

- **Value Objects**: Immutable objects defined by their attributes
  - Example: `Money`, `Quantity`, `OrderStatus`
  - No identity
  - Immutable
  - Compared by value, not reference

- **Aggregates**: Clusters of entities and value objects
  - Example: `Order` (aggregate root) contains `OrderItem` entities
  - Enforce consistency boundaries
  - Only aggregate roots can be accessed from outside

- **Domain Events**: Represent business occurrences
  - Example: `OrderCreatedEvent`, `OrderConfirmedEvent`
  - Immutable
  - Past tense naming
  - Contain relevant data

- **Domain Services**: Business logic that doesn't belong to a single entity
  - Example: `OrderPricingService`
  - Stateless
  - Operate on multiple entities

- **Repository Interfaces**: Contracts for data access
  - Example: `IOrderRepository`
  - Defined in domain, implemented in infrastructure
  - Abstract persistence details

**Rules**:
- No dependencies on outer layers
- No framework dependencies
- Pure business logic
- Framework-agnostic

### 2. Application Layer (Use Cases)

**Purpose**: Orchestrates domain objects to fulfill use cases.

**Components**:
- **Commands**: Represent write operations
  - Example: `CreateOrderCommand`, `ConfirmOrderCommand`
  - Contain data needed for the operation
  - Handled by command handlers

- **Command Handlers**: Execute commands
  - Example: `CreateOrderHandler`
  - Orchestrate domain objects
  - Persist changes
  - Publish events

- **Queries**: Represent read operations
  - Example: `GetOrderQuery`, `ListOrdersQuery`
  - Return DTOs, not domain entities
  - Optimized for reading

- **Query Handlers**: Execute queries
  - Example: `GetOrderHandler`
  - Fetch data
  - Transform to DTOs

- **DTOs**: Data transfer objects
  - Example: `CreateOrderDto`, `OrderResponseDto`
  - Define API contracts
  - Validation rules
  - No business logic

- **Event Handlers**: React to domain events
  - Example: `OrderCreatedHandler`
  - Side effects
  - Asynchronous processing

**Rules**:
- Depends only on domain layer
- No direct database access
- Uses repository interfaces
- Coordinates domain objects

### 3. Infrastructure Layer (Technical Details)

**Purpose**: Implements technical concerns and external dependencies.

**Components**:
- **Repository Implementations**: Concrete data access
  - Example: `OrderRepository`
  - Implements domain repository interfaces
  - Uses TypeORM
  - Maps between domain and persistence models

- **Database Schemas**: ORM entities
  - Example: `OrderSchema`, `OrderItemSchema`
  - TypeORM entities
  - Database-specific

- **Mappers**: Convert between layers
  - Example: `OrderMapper`
  - Domain ↔ Persistence
  - Isolate domain from infrastructure

- **Event Bus**: Publish domain events
  - Example: `EventBusService`
  - Uses @nestjs/cqrs
  - Decouples event producers and consumers

- **External Services**: Third-party integrations
  - Example: Payment gateways, email services
  - Implement domain interfaces
  - Isolate external dependencies

**Rules**:
- Implements domain interfaces
- Contains framework-specific code
- Handles technical concerns
- No business logic

### 4. Presentation Layer (API)

**Purpose**: Exposes application functionality through APIs.

**Components**:
- **Controllers**: HTTP endpoints
  - Example: `OrderController`
  - Route requests
  - Validate input
  - Return responses

- **Filters**: Exception handling
  - Example: `GlobalErrorFilter` installed through `ErrorsModule`
  - Transform exceptions to HTTP responses
  - Logging

- **Interceptors**: Cross-cutting concerns
  - Example: response wrapping and the structured logger package interceptor
  - Logging
  - Transformation
  - Caching

- **Validation**: Input validation
  - Uses class-validator
  - DTOs with decorators
  - Automatic validation

**Rules**:
- Depends on application layer
- No direct domain access
- Uses DTOs for data transfer
- Framework-specific

## Data Flow

### Command Flow (Write Operation)

```
1. Controller receives HTTP request
   ↓
2. Validates DTO
   ↓
3. Creates Command
   ↓
4. CommandBus executes CommandHandler
   ↓
5. Handler loads domain entities (via repository)
   ↓
6. Handler calls domain methods
   ↓
7. Domain entity changes state, raises events
   ↓
8. Handler persists entity (via repository)
   ↓
9. Handler publishes domain events
   ↓
10. EventHandlers react to events
   ↓
11. Controller returns response
```

### Query Flow (Read Operation)

```
1. Controller receives HTTP request
   ↓
2. Creates Query
   ↓
3. QueryBus executes QueryHandler
   ↓
4. Handler fetches data (via repository)
   ↓
5. Handler transforms to DTO
   ↓
6. Controller returns DTO
```

## CQRS Pattern

### Why CQRS?

- **Separation of Concerns**: Different models for reads and writes
- **Scalability**: Scale reads and writes independently
- **Optimization**: Optimize queries without affecting commands
- **Clarity**: Clear distinction between state changes and queries

### Implementation

**Commands** (Write):
- Change state
- Validate business rules
- Raise domain events
- Return minimal data (usually just ID)

**Queries** (Read):
- Don't change state
- Optimized for reading
- Return DTOs
- Can bypass domain layer for performance

## Event-Driven Architecture

### Domain Events

Domain events represent something that happened in the domain:

```typescript
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: Money,
  ) {
    super();
  }
}
```

### Event Flow

```
1. Domain entity raises event
   ↓
2. Event stored in aggregate
   ↓
3. Handler persists aggregate
   ↓
4. Handler publishes events
   ↓
5. EventHandlers react
   ↓
6. Side effects executed
```

### Benefits

- **Decoupling**: Producers don't know consumers
- **Extensibility**: Add new handlers without changing existing code
- **Audit Trail**: Events provide history
- **Integration**: Easy to integrate with external systems

## Dependency Injection

### Inversion of Control

The domain layer defines interfaces, infrastructure implements them:

```typescript
// Domain layer (interface)
export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
}

// Infrastructure layer (implementation)
@Injectable()
export class OrderRepository implements IOrderRepository {
  // Implementation using TypeORM
}

// Application layer (usage)
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}
}
```

### Benefits

- Domain doesn't depend on infrastructure
- Easy to test (mock interfaces)
- Easy to swap implementations

## Testing Strategy

### Unit Tests

Test domain logic in isolation:

```typescript
describe('Order', () => {
  it('should calculate total amount', () => {
    const order = Order.create('customer-1', items);
    expect(order.getTotalAmount().amount).toBe(100);
  });

  it('should not allow confirming cancelled order', () => {
    order.cancel();
    expect(() => order.confirm()).toThrow(InvalidOrderStateException);
  });
});
```

### Integration Tests

Test infrastructure components:

```typescript
describe('OrderRepository', () => {
  it('should save and retrieve order', async () => {
    const order = Order.create('customer-1', items);
    await repository.save(order);

    const retrieved = await repository.findById(order.id);
    expect(retrieved).toBeDefined();
  });
});
```

### E2E Tests

Test complete flows:

```typescript
describe('Order API', () => {
  it('should create order', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .send(createOrderDto)
      .expect(201);

    expect(response.body.orderId).toBeDefined();
  });
});
```

## Best Practices

### 1. Keep Domain Pure

```typescript
// ✅ Good: Pure domain logic
export class Order extends AggregateRoot<string> {
  public confirm(): void {
    if (!this._status.isPending()) {
      throw new InvalidOrderStateException('Cannot confirm non-pending order');
    }
    this._status = OrderStatus.confirmed();
  }
}

// ❌ Bad: Infrastructure concerns in domain
export class Order extends AggregateRoot<string> {
  public async confirm(): Promise<void> {
    await this.repository.save(this); // NO!
  }
}
```

### 2. Use Value Objects

```typescript
// ✅ Good: Value object with validation
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  public static create(amount: number): Money {
    if (amount < 0) {
      throw new Error('Money cannot be negative');
    }
    return new Money({ amount });
  }
}

// ❌ Bad: Primitive obsession
export class Order {
  private amount: number; // No validation, no behavior
}
```

### 3. Raise Domain Events

```typescript
// ✅ Good: Raise events for important occurrences
export class Order extends AggregateRoot<string> {
  public confirm(): void {
    this._status = OrderStatus.confirmed();
    this.addDomainEvent(new OrderConfirmedEvent(this.id));
  }
}

// ❌ Bad: Side effects in domain
export class Order extends AggregateRoot<string> {
  public confirm(): void {
    this._status = OrderStatus.confirmed();
    this.sendEmail(); // NO!
  }
}
```

### 4. Validate at Boundaries

```typescript
// ✅ Good: Validate in DTOs and value objects
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  items: CreateOrderItemDto[];
}

// ❌ Bad: No validation
export class CreateOrderDto {
  customerId: string;
  items: any[];
}
```

## Common Pitfalls

### 1. Anemic Domain Model

**Problem**: Entities with only getters/setters, logic in services.

**Solution**: Put behavior in entities.

### 2. Leaking Infrastructure

**Problem**: Domain depends on infrastructure (e.g., TypeORM entities).

**Solution**: Use repository interfaces, mappers.

### 3. Fat Controllers

**Problem**: Business logic in controllers.

**Solution**: Move logic to domain/application layers.

### 4. Ignoring Events

**Problem**: Direct coupling between components.

**Solution**: Use domain events for side effects.

## Conclusion

This architecture provides:
- **Maintainability**: Clear separation of concerns
- **Testability**: Easy to test each layer
- **Flexibility**: Easy to change infrastructure
- **Scalability**: CQRS enables independent scaling
- **Domain Focus**: Business logic is central and protected

The key is following the dependency rule and keeping the domain pure.
