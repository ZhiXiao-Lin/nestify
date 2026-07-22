# DDD Patterns Guide

This document explains the Domain-Driven Design patterns used in the sample API and reusable framework packages.

## Core Building Blocks

### 1. Entity

**Definition**: An object with a distinct identity that persists over time.

**Characteristics**:
- Has a unique identifier
- Identity remains constant even if attributes change
- Compared by identity only within the same concrete entity type
- Has a lifecycle

**Example**:
```typescript
export class OrderItem extends Entity<string> {
  private _productId: string;
  private _quantity: Quantity;
  private _unitPrice: Money;

  private constructor(props: OrderItemProps) {
    super(props.id);  // Identity
    this._productId = props.productId;
    this._quantity = props.quantity;
    this._unitPrice = props.unitPrice;
  }

  public static create(props: OrderItemProps): OrderItem {
    return new OrderItem(props);
  }

  // Behavior
  public getTotalPrice(): Money {
    return this._unitPrice.multiply(this._quantity.value);
  }

  public updateQuantity(quantity: Quantity): void {
    this._quantity = quantity;
  }
}
```

**When to Use**:
- Object needs to be tracked over time
- Object has a lifecycle
- Object needs to be distinguished from similar objects

### 2. Value Object

**Definition**: An immutable object defined by its attributes, not identity.

**Characteristics**:
- No identity
- Immutable
- Compared structurally by value without depending on object key order
- Self-validating
- Side-effect free

**Example**:
```typescript
export class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  private constructor(props: MoneyProps) {
    super(props);  // Frozen/immutable
  }

  public static create(amount: number, currency: string = 'USD'): Money {
    // Self-validation
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    return new Money({ amount, currency });
  }

  // Returns new instance (immutable)
  public add(money: Money): Money {
    if (this.currency !== money.currency) {
      throw new Error('Cannot add money with different currencies');
    }
    return Money.create(this.amount + money.amount, this.currency);
  }

  public multiply(multiplier: number): Money {
    return Money.create(this.amount * multiplier, this.currency);
  }
}
```

**When to Use**:
- Measuring, quantifying, or describing things
- No need to track identity
- Immutability is desired
- Equality is based on attributes

`@a3s-lab/ddd` snapshots value-object props recursively. Use primitives, valid `Date` values, arrays, and plain objects;
cycles, functions, symbol values, custom class instances, and unbounded graphs are rejected. `toObject()` returns a
defensive snapshot rather than the internal props object.

**Common Value Objects**:
- Money, Currency
- Address, Email, Phone
- DateRange, TimeSpan
- Quantity, Percentage
- Status, State

### 3. Aggregate

**Definition**: A cluster of entities and value objects with a defined boundary.

**Characteristics**:
- Has an aggregate root (entry point)
- Enforces consistency boundaries
- Only root is accessible from outside
- Transactions don't cross aggregate boundaries
- Loaded and saved as a whole
- Exposes pending domain events as a frozen snapshot owned by the root

**Example**:
```typescript
export class Order extends AggregateRoot<string> {
  private _customerId: string;
  private _items: OrderItem[];  // Child entities
  private _status: OrderStatus;  // Value object

  // Factory method
  public static create(customerId: string, items: OrderItem[]): Order {
    const order = new Order({
      id: OrderId.create(),
      customerId,
      items,
      status: OrderStatus.pending(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Raise domain event
    order.addDomainEvent(new OrderCreatedEvent(order.id, customerId));

    return order;
  }

  // Business logic - enforces invariants
  public confirm(): void {
    if (!this._status.isPending()) {
      throw new InvalidOrderStateException('Cannot confirm non-pending order');
    }
    this._status = OrderStatus.confirmed();
    this.addDomainEvent(new OrderConfirmedEvent(this.id));
  }

  // Protects child entities
  public addItem(item: OrderItem): void {
    if (!this._status.isPending()) {
      throw new InvalidOrderStateException('Cannot modify non-pending order');
    }
    this._items.push(item);
  }
}
```

**Design Rules**:
1. Reference other aggregates by ID only
2. Keep aggregates small
3. Update one aggregate per transaction
4. Use eventual consistency between aggregates

### 4. Domain Event

**Definition**: A record of something that happened in the domain.

**Characteristics**:
- Immutable
- Past tense naming
- Contains relevant data
- Timestamp of occurrence

**Example**:
```typescript
export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: Money,
  ) {
    super();  // Sets occurredOn timestamp
  }

  getAggregateId(): string {
    return this.orderId;
  }
}
```

**When to Use**:
- Something important happened in the domain
- Other parts of the system need to react
- Audit trail is needed
- Integration with external systems

**Event Naming**:
- Use past tense: `OrderCreated`, `OrderConfirmed`, `PaymentReceived`
- Be specific: `OrderShipped` not `OrderUpdated`
- Include context: `OrderCancelledByCustomer` vs `OrderCancelledBySystem`

### 5. Domain Service

**Definition**: Business logic that doesn't naturally fit in an entity or value object.

**Characteristics**:
- Stateless
- Operates on multiple entities
- Named after domain concepts
- Contains business logic

**Example**:
```typescript
@Injectable()
export class OrderPricingService {
  calculateTotal(order: Order): Money {
    return order.getTotalAmount();
  }

  applyDiscount(total: Money, discountPercent: number): Money {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Invalid discount percentage');
    }
    const discountMultiplier = 1 - discountPercent / 100;
    return Money.create(total.amount * discountMultiplier, total.currency);
  }

  calculateShipping(order: Order, destination: Address): Money {
    // Complex shipping calculation logic
  }
}
```

**When to Use**:
- Logic involves multiple aggregates
- Logic doesn't belong to any single entity
- Stateless operations
- Complex calculations

### 6. Repository

**Definition**: Abstraction for data access, providing collection-like interface.

**Characteristics**:
- Interface defined in domain
- Implementation in infrastructure
- Hides persistence details
- Works with aggregates

**Example**:
```typescript
// Domain layer - interface
export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<Order>;
  delete(id: string): Promise<void>;
}

// Infrastructure layer - implementation
@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderSchema)
    private readonly orderRepo: Repository<OrderSchema>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const schema = await this.orderRepo.findOne({ where: { id } });
    if (!schema) return null;
    return OrderMapper.toDomain(schema);
  }

  async save(order: Order): Promise<Order> {
    const schema = OrderMapper.toPersistence(order);
    await this.orderRepo.save(schema);
    return order;
  }
}
```

**Repository vs DAO**:
- Repository: Works with domain objects, collection-like
- DAO: Works with database records, CRUD operations

## Strategic Patterns

### 1. Bounded Context

**Definition**: A boundary within which a domain model is defined and applicable.

**In This Sample API**:
- `order` module is a bounded context
- Has its own domain model
- Clear boundaries with other contexts

**Structure**:
```
src/modules/
├── order/           # Order bounded context
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
├── inventory/       # Inventory bounded context (future)
└── customer/        # Customer bounded context (future)
```

### 2. Ubiquitous Language

**Definition**: A shared language between developers and domain experts.

**Examples in Order Context**:
- "Order" not "Purchase" or "Transaction"
- "Confirm" not "Approve" or "Accept"
- "Cancel" not "Delete" or "Remove"
- "OrderItem" not "LineItem" or "OrderLine"

**Implementation**:
```typescript
// Use domain language in code
class Order {
  confirm(): void { }      // Not approve()
  cancel(): void { }       // Not delete()
  addItem(): void { }      // Not addLineItem()
}

// Use domain language in events
class OrderConfirmed { }   // Not OrderApproved
class OrderCancelled { }   // Not OrderDeleted
```

### 3. Context Mapping

**Definition**: Relationships between bounded contexts.

**Common Patterns**:
- **Shared Kernel**: Shared code between contexts
- **Customer-Supplier**: One context depends on another
- **Anti-Corruption Layer**: Translate between contexts

**Example**:
```typescript
// Anti-corruption layer for external payment service
export class PaymentServiceAdapter {
  constructor(private readonly externalPaymentService: ExternalPaymentAPI) {}

  async processPayment(order: Order): Promise<PaymentResult> {
    // Translate domain model to external API
    const externalRequest = {
      amount: order.getTotalAmount().amount,
      currency: order.getTotalAmount().currency,
      reference: order.id,
    };

    const externalResponse = await this.externalPaymentService.charge(externalRequest);

    // Translate external response to domain model
    return new PaymentResult(
      externalResponse.success,
      externalResponse.transactionId,
    );
  }
}
```

## Application Patterns

### 1. CQRS (Command Query Responsibility Segregation)

**Definition**: Separate models for reading and writing data.

**Commands** (Write):
```typescript
// Command
export class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItemDto[],
  ) {}
}

// Handler
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler {
  async execute(command: CreateOrderCommand): Promise<string> {
    const order = Order.create(command.customerId, items);
    await this.orderRepository.save(order);
    return order.id;
  }
}
```

**Queries** (Read):
```typescript
// Query
export class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}

// Handler
@QueryHandler(GetOrderQuery)
export class GetOrderHandler {
  async execute(query: GetOrderQuery): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(query.orderId);
    return this.mapToDto(order);
  }
}
```

### 2. Event Sourcing (Optional)

**Definition**: Store state as a sequence of events.

**Note**: This sample API uses traditional state storage, but can be extended to event sourcing.

```typescript
// Event sourced aggregate (conceptual)
class Order extends EventSourcedAggregate {
  apply(event: DomainEvent): void {
    if (event instanceof OrderCreated) {
      this._status = OrderStatus.pending();
    } else if (event instanceof OrderConfirmed) {
      this._status = OrderStatus.confirmed();
    }
  }

  // Rebuild state from events
  static fromEvents(events: DomainEvent[]): Order {
    const order = new Order();
    events.forEach(event => order.apply(event));
    return order;
  }
}
```

## Best Practices

### 1. Rich Domain Model

```typescript
// ✅ Rich domain model - behavior in entity
class Order {
  confirm(): void {
    this.validateCanConfirm();
    this._status = OrderStatus.confirmed();
    this.addDomainEvent(new OrderConfirmed(this.id));
  }

  private validateCanConfirm(): void {
    if (!this._status.isPending()) {
      throw new InvalidOrderStateException();
    }
    if (this._items.length === 0) {
      throw new EmptyOrderException();
    }
  }
}

// ❌ Anemic domain model - behavior in service
class Order {
  status: string;
  items: OrderItem[];
}

class OrderService {
  confirm(order: Order): void {
    if (order.status !== 'PENDING') throw new Error();
    order.status = 'CONFIRMED';
  }
}
```

### 2. Invariant Protection

```typescript
class Order {
  // Protect invariants through encapsulation
  private _items: OrderItem[];

  get items(): readonly OrderItem[] {
    return Object.freeze([...this._items]);  // Return immutable snapshot
  }

  addItem(item: OrderItem): void {
    // Validate invariant
    if (!this._status.isPending()) {
      throw new InvalidOrderStateException();
    }
    this._items.push(item);
  }
}
```

### 3. Factory Methods

```typescript
class Order {
  // Use factory methods instead of constructors
  public static create(customerId: string, items: OrderItem[]): Order {
    // Validation
    if (!customerId) throw new Error('Customer ID required');
    if (items.length === 0) throw new Error('Order must have items');

    // Create with proper initial state
    const order = new Order({
      id: OrderId.create(),
      customerId,
      items,
      status: OrderStatus.pending(),
      createdAt: new Date(),
    });

    // Raise creation event
    order.addDomainEvent(new OrderCreated(order.id));

    return order;
  }

  // For reconstituting from persistence
  public static reconstitute(props: OrderProps): Order {
    return new Order(props);  // No events, no validation
  }
}
```

### 4. Specification Pattern

```typescript
// For complex business rules
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

class OrderCanBeConfirmedSpec implements Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.status.isPending() &&
           order.items.length > 0 &&
           order.getTotalAmount().amount > 0;
  }
}

// Usage
class Order {
  confirm(): void {
    const spec = new OrderCanBeConfirmedSpec();
    if (!spec.isSatisfiedBy(this)) {
      throw new InvalidOrderStateException();
    }
    this._status = OrderStatus.confirmed();
  }
}
```

## Summary

| Pattern | Purpose | Location |
|---------|---------|----------|
| Entity | Objects with identity | Domain |
| Value Object | Immutable descriptors | Domain |
| Aggregate | Consistency boundary | Domain |
| Domain Event | Record of occurrence | Domain |
| Domain Service | Cross-entity logic | Domain |
| Repository | Data access abstraction | Domain (interface), Infrastructure (impl) |
| CQRS | Separate read/write | Application |
| Bounded Context | Model boundary | Module |

These patterns work together to create a maintainable, expressive domain model that captures business logic effectively.
