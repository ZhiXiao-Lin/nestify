# @a3s-lab/cqrs

NestJS CQRS adapters for DDD-style backend APIs.

## Install

```bash
pnpm add @a3s-lab/cqrs @a3s-lab/ddd
pnpm add @nestjs/common @nestjs/cqrs
```

## Use

```ts
import { Inject, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, IDomainEventPublisher } from '@a3s-lab/ddd';
import { NestCqrsDomainEventPublisher } from '@a3s-lab/cqrs';

@Module({
    imports: [CqrsModule],
    providers: [
        {
            provide: DOMAIN_EVENT_PUBLISHER,
            useClass: NestCqrsDomainEventPublisher,
        },
    ],
})
export class ResourceModule {}

class CompleteUseCase {
    constructor(@Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: IDomainEventPublisher) {}
}
```

## Exports

- `NestCqrsDomainEventPublisher`
- `createNestCqrsDomainEventPublisherProvider`

## Notes

This package adapts `@a3s-lab/ddd` domain event publisher contracts to NestJS CQRS. It does not define domain events, command handlers, event names, or transport/broker policy.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
