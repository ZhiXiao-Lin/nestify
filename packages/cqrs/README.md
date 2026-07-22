# @a3s-lab/cqrs

Deterministic NestJS CQRS adapters for the domain-event contracts in `@a3s-lab/ddd`. The package validates and bounds
event batches, supports ordered, bounded-parallel, and native Nest publication, and keeps the DDD injection token
decoupled from Nest CQRS.

## Install

```bash
pnpm add @a3s-lab/cqrs @a3s-lab/ddd
pnpm add @nestjs/common @nestjs/cqrs
```

The package supports NestJS 10 and 11.

## Use

### Register the module

`NestCqrsDomainEventsModule` imports and re-exports Nest's `CqrsModule`, provides `NestCqrsDomainEventPublisher`, and aliases
`DOMAIN_EVENT_PUBLISHER` to that same instance. Registration is non-global, ordered, and limited to 1,000 events per
batch by default.

```ts
import { DOMAIN_EVENT_PUBLISHER, type AggregateRoot, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { Inject, Module } from '@nestjs/common';
import { NestCqrsDomainEventsModule } from '@a3s-lab/cqrs';

@Module({
    imports: [NestCqrsDomainEventsModule.register()],
})
export class ResourceModule {}

class CompleteUseCase {
    constructor(@Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: IDomainEventPublisher) {}

    async publish(aggregate: AggregateRoot<string>) {
        await this.events.publishAll(aggregate.domainEvents);
        aggregate.clearEvents();
    }
}
```

Use asynchronous registration when policy comes from configuration:

```ts
NestCqrsDomainEventsModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        mode: config.get('DOMAIN_EVENT_BATCH_MODE', 'ordered'),
        maxConcurrency: config.get('DOMAIN_EVENT_CONCURRENCY', 8),
        maxBatchSize: config.get('DOMAIN_EVENT_MAX_BATCH_SIZE', 1_000),
    }),
})
```

Set `isGlobal: true` on the `register` or `registerAsync` argument only when the publisher should be application-wide.

### Choose batch semantics

`publish(event)` validates the domain-event shape and awaits a Promise returned by a custom Nest event publisher.
`publishAll(events)` snapshots and validates the whole array before it publishes anything.

| Mode | Semantics | Failure behavior |
| --- | --- | --- |
| `ordered` (default) | Publishes one event at a time in array order. | Stops before admitting later events and rethrows the original error. |
| `parallel` | Publishes up to `maxConcurrency` events at once and waits for every admitted event. | Rethrows one original error; multiple failures become `DomainEventBatchPublicationError` in event order. |
| `native` | Calls `EventBus.publishAll()` once and awaits a returned Promise or Promise array. | Preserves one error and aggregates multiple returned failures. |

```ts
NestCqrsDomainEventsModule.register({
    mode: 'parallel',
    maxConcurrency: 4,
    maxBatchSize: 250,
})
```

Prefer `ordered` for events from one aggregate. Select `parallel` only when handlers or a custom publisher do not depend
on cross-event ordering. Select `native` only when the configured Nest event publisher defines meaningful batch
semantics.

### Compatibility provider

Existing modules that already import Nest's `CqrsModule` can keep the original provider helper. It uses the safe default
options:

```ts
import { createNestCqrsDomainEventPublisherProvider } from '@a3s-lab/cqrs';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
    imports: [CqrsModule],
    providers: [createNestCqrsDomainEventPublisherProvider()],
})
export class ResourceModule {}
```

For manual configurable composition, `createNestCqrsDomainEventPublisherProviders(options)` returns an options provider,
the concrete publisher, and a `useExisting` alias for `DOMAIN_EVENT_PUBLISHER`.

## Exports

- `NestCqrsDomainEventsModule`: synchronous/asynchronous Nest module registration.
- `NestCqrsDomainEventPublisher`: the `IDomainEventPublisher` adapter.
- `createNestCqrsDomainEventPublisherProvider`: backward-compatible default provider.
- `createNestCqrsDomainEventPublisherProviders`: configurable provider set with a single shared instance.
- `NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS` and default constants.
- Publisher/module option and batch-mode types.
- `CqrsDomainEventConfigurationError` and `DomainEventBatchPublicationError` with ordered failure metadata.

## Notes

`publishAll()` accepts the readonly event snapshots exposed by DDD aggregate roots. The adapter preserves the configured
Nest event publisher's completion model. Nest's default in-memory publisher synchronously admits events to its RxJS
stream; awaiting this adapter does not turn asynchronous event handlers into a database transaction or delivery
acknowledgement. Configure Nest CQRS error policy deliberately.

This package does not provide durable delivery, exactly-once processing, an outbox, retries, broker transport, domain
event definitions, or handler naming policy. Persist state and an outbox atomically when delivery must survive process
failure; use `@a3s-lab/nats` or another transport at that boundary.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
