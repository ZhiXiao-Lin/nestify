# @a3s-lab/ddd

Framework-independent DDD primitives for backend API applications.

## Install

```bash
pnpm add @a3s-lab/ddd
```

## Use

```ts
import { AggregateRoot, DomainEvent, Guard, Result } from '@a3s-lab/ddd';

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

## Exports

- Entities, aggregate roots, value objects, and auditable entities
- Domain events and domain event publishing contracts
- Repository, unit of work, and use case contracts
- Guard helpers and `Result`

## Notes

This package has no NestJS dependency. Keep application rules, persistence schemas, and transport-specific code outside this package.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
