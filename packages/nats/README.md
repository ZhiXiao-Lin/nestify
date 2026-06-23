# @a3s-lab/nats

NestJS module and service helpers for NATS publish/subscribe, request/reply, and JetStream messaging.

## Install

```bash
pnpm add @a3s-lab/nats @nestjs/common nats
```

## Use

```ts
import { NatsModule } from '@a3s-lab/nats';

@Module({
    imports: [
        NatsModule.register({
            servers: ['nats://localhost:4222'],
            name: 'api-service',
            timeout: 5000,
            jetstream: { enabled: true },
        }),
    ],
})
export class AppModule {}
```

Inject the service to publish events, send requests, and create subscriptions:

```ts
import { Injectable } from '@nestjs/common';
import { NatsService } from '@a3s-lab/nats';

@Injectable()
export class ResourceEvents {
    constructor(private readonly nats: NatsService) {}

    async publishChanged(resourceId: string) {
        await this.nats.publish({
            subject: 'resources.changed',
            data: { resourceId },
        });
    }

    async lookup(resourceId: string) {
        return this.nats.request$<{ status: string }>('resources.lookup', {
            resourceId,
        });
    }

    async subscribe() {
        return this.nats.subscribe$('resources.changed', async event => {
            await handleResourceChanged(event);
        });
    }

    async publishStreamEvent(resourceId: string) {
        await this.nats.jsPublish({
            stream: 'RESOURCE_EVENTS',
            subject: 'resources.changed',
            data: { resourceId },
        });
    }
}
```

## Exports

- `NatsModule`
- `NatsService`
- NATS message, headers, subscription, JetStream, health, and module option types
- Configurable module definition helpers

## Notes

The package owns generic NATS connection management, headers, serialization helpers, subscriptions, JetStream publish/subscribe helpers, health state, and lifecycle cleanup. Applications still own subject naming, stream naming, payload contracts, and message handling policy.
