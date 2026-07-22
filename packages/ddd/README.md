# @a3s-lab/ddd

Framework-independent DDD primitives with explicit identity, immutability, time, event-ownership, guard, and result-state invariants.

## Install

```bash
pnpm add @a3s-lab/ddd
```

## Use

```ts
import { AggregateRoot, DomainEvent, Guard, Result, ValueObject } from '@a3s-lab/ddd';

class Money extends ValueObject<{ amount: number; currency: string; tags: string[] }> {
    static create(amount: number, currency: string): Result<Money> {
        const amountGuard = Guard.inRange(amount, 0, Number.MAX_SAFE_INTEGER, 'amount');
        if (!amountGuard.succeeded) return Result.fail(amountGuard.message);
        return Result.ok(new Money({ amount, currency, tags: [] }));
    }
}

class EntityCreated extends DomainEvent {
    constructor(private readonly aggregateId: string) {
        super();
    }

    getAggregateId() {
        return this.aggregateId;
    }
}

class ExampleAggregate extends AggregateRoot<string> {
    static create(id: string): Result<ExampleAggregate> {
        const guard = Guard.againstNullOrUndefined(id, 'id');
        if (!guard.succeeded) {
            return Result.fail(guard.message ?? 'Invalid id');
        }

        const aggregate = new ExampleAggregate(id);
        aggregate.addDomainEvent(new EntityCreated(id));
        return Result.ok(aggregate);
    }
}
```

Aggregate event access is a frozen snapshot. Pass it directly to publishers that accept `readonly DomainEvent[]`, then clear the aggregate only after successful publication:

```ts
await publisher.publishAll(aggregate.domainEvents);
aggregate.clearEvents();
```

Auditable values make defensive `Date` copies, validate chronology, and support deterministic soft-deletion age calculations:

```ts
const days = record.daysSinceDeletion(new Date('2026-07-22T00:00:00.000Z'));
```

## Invariant Defaults

- Entity IDs cannot be `null`, `undefined`, blank strings, `NaN`, or infinite numbers. Two entities are equal only when their concrete class and ID are equal.
- Value-object props are deep snapshots of primitives, valid dates, arrays, and plain objects. Key order does not affect equality; cycles, custom class instances, functions, symbol values, invalid dates, depth over 64, and more than 10,000 entries are rejected.
- `toObject()` returns another defensive snapshot. Nested arrays and records are frozen; callers cannot mutate the value object's internal state.
- Aggregate roots expose frozen event-array copies. Event and audit timestamps return defensive `Date` copies, and deletion cannot predate the last update.
- `Result.ok(undefined)` preserves `undefined`; failures always contain a non-empty string bounded to 4,096 characters. `fromTry` and `fromTryAsync` safely normalize unknown thrown values.
- Numeric guards fail closed for `NaN`, infinities, and reversed/non-finite bounds. Membership diagnostics are circular-safe and bounded.
- DI tokens use namespaced `Symbol.for(...)` keys so separately resolved copies share the same domain-event publisher and unit-of-work token.

## Exports

- Validated entities, immutable structural value objects, aggregate roots, and chronological auditable entities
- Domain events and domain event publishing contracts
- Repository, unit of work, and use case contracts
- Finite, non-throwing guard helpers and explicit `Result` success/failure composition

## Notes

This package has no NestJS dependency. Keep application rules, persistence schemas, and transport-specific code outside this package. Value-object props should be domain data, not service objects or mutable custom class instances. `domainEvents` and `IDomainEventPublisher.publishAll()` intentionally use readonly arrays.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
