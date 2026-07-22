# @a3s-lab/nats

Lifecycle-safe NestJS integration for core NATS publish/subscribe, request/reply, connection health, and JetStream messaging.

## Install

```bash
pnpm add @a3s-lab/nats @nestjs/common nats
```

## Use

Register the module synchronously or asynchronously. The module connects during Nest initialization, coalesces concurrent connection attempts, and can reconnect lazily after an unexpected close.

```ts
import { Module } from '@nestjs/common';
import { NatsModule } from '@a3s-lab/nats';

@Module({
    imports: [
        NatsModule.register({
            servers: ['nats://nats-a:4222', 'nats://nats-b:4222'],
            name: 'resource-api',
            auth: {
                user: process.env.NATS_USER,
                pass: process.env.NATS_PASSWORD,
            },
            requestTimeoutMs: 5_000,
            shutdownTimeoutMs: 10_000,
            jetstream: { enabled: true, domain: 'A3S' },
        }),
    ],
})
export class MessagingModule {}
```

`servers` accepts either one string or an array. Token authentication and username/password authentication are mutually exclusive. Top-level `user`, `pass`, and `token` remain supported; the nested `auth` object is useful for configuration factories. Invalid or conflicting options fail during provider construction with `NatsConfigurationError`.

TLS accepts file paths or inline PEM values:

```ts
NatsModule.register({
    servers: 'tls://nats.internal:4222',
    tls: {
        caFile: '/run/secrets/nats-ca.pem',
        certFile: '/run/secrets/nats-client.pem',
        keyFile: '/run/secrets/nats-client-key.pem',
        rejectUnauthorized: true,
    },
});
```

`verify` is retained as an alias for `rejectUnauthorized`. Certificate verification defaults to `true`; disabling it should be limited to controlled development environments.

The exported option builder returns the exact validated object passed to the first-party NATS client:

```ts
import { createNatsConnectionOptions } from '@a3s-lab/nats';

const connection = createNatsConnectionOptions({
    servers: 'nats://localhost:4222',
    maxReconnectAttempts: 20,
});
```

### Publish and request/reply

```ts
import { Injectable } from '@nestjs/common';
import { NatsService } from '@a3s-lab/nats';

@Injectable()
export class ResourceMessaging {
    constructor(private readonly nats: NatsService) {}

    async publishChanged(resourceId: string) {
        await this.nats.publish({
            subject: 'resources.changed',
            data: { resourceId },
            headers: { 'x-schema-version': '1' },
        });

        // Core NATS publish is buffered. Flush only when a server round trip is required.
        await this.nats.flush();
    }

    lookup(resourceId: string) {
        return this.nats.request$<{ status: string }>('resources.lookup', { resourceId });
    }

    async discover(resourceId: string) {
        return this.nats.requestMany({
            subject: 'resources.discover',
            data: { resourceId },
            strategy: 'count',
            expectedResponseCount: 3,
            maxWait: 2_000,
        });
    }
}
```

Alternatively, set `publish({ timeout: 1_000 })` to publish and perform the bounded flush in one operation.

`requestMany()` also supports `timer`, `jitter`, and `sentinel` completion strategies. Transport and validation failures retain their original `cause` inside structured `NatsRequestError` or `NatsPublishError` instances.

Request handlers can respond without manually publishing to the reply subject:

```ts
const subscription = await nats.subscribe({ subject: 'resources.lookup' }, async message => {
    message.respond({ status: 'ready' }, { 'x-schema-version': '1' });
});
```

### Subscriptions

Every returned subscription belongs to the service instance that created it and exposes explicit completion controls:

```ts
const subscription = await nats.subscribe$<{ resourceId: string }>(
    'resources.changed',
    async event => processResource(event.resourceId),
);

await subscription.drain(); // Process messages already received by the client, then close.
await subscription.closed;  // Resolves after the iterator and active handler finish.

// Immediate alternative:
subscription.cancel();
```

Core subscriptions accept `queue`, `maxMessages`, and first-message `timeout`. Passing a fabricated or foreign handle to `unsubscribe()` throws `NatsSubscriptionOwnershipError`; canceling an owned handle more than once is safe.

### JetStream

```ts
await nats.jsPublish({
    stream: 'RESOURCE_EVENTS',
    subject: 'resources.changed',
    data: { resourceId: 'resource-1' },
});

const consumer = await nats.jsSubscribe(
    {
        stream: 'RESOURCE_EVENTS',
        subject: 'resources.changed',
        durable: 'resource-workers',
        queue: 'workers',
        config: {
            deliverPolicy: 'new',
            ackPolicy: 'explicit',
            ackWait: 30_000,
            maxDeliver: 5,
        },
    },
    async message => processEvent(message.data),
);
```

Automatic acknowledgement occurs only after the handler succeeds. Handler failures are negatively acknowledged, `ackPolicy: 'none'` disables acknowledgements, and `manualAck: true` exposes `ack()`, `nak()`, `term()`, and `inProgress()` to the handler. Publish acknowledgements are checked against the requested stream so a subject routed to an unexpected stream fails explicitly.

### Health and lifecycle

```ts
const health = await nats.healthCheck(1_000);
const healthy = await nats.isHealthy();
const state = nats.getState();
const stats = await nats.getStats();
```

`healthCheck()` performs a bounded NATS `flush()` instead of trusting an in-memory flag. Status events update disconnect, error, reconnect count, and active server state; events from replaced connections cannot overwrite the active connection state.

During shutdown the service rejects new operations, cleans up late subscription results, waits for active handlers and requests, drains buffered messages, and falls back to `close()` when draining fails. The entire sequence is bounded by `shutdownTimeoutMs`; `close()` and Nest lifecycle cleanup are idempotent. Set `drainOnShutdown: false` only when immediate connection close is intentional.

## Exports

- `NatsModule`
- `NatsService` and `NatsServiceImpl`
- `createNatsConnectionOptions`
- `Subscription`, `NatsMessage`, `JetStreamMessage`, `NatsHealthResult`, and request/subscription option types
- Structured connection, configuration, lifecycle, publish, request, and subscription errors
- Configurable module definition helpers

## Notes

The package owns generic NATS connection state, serialization, headers, request/reply, subscriptions, JetStream consumer mapping, acknowledgement policy, health probes, and bounded lifecycle cleanup. Applications still own subject and stream naming, payload schemas, idempotency, retry/dead-letter policy, and business message handling.

`getConnection()` and `getJetStream()` are advanced escape hatches. Work performed directly on the returned native clients is not tracked by the service's operation drain and must not outlive application shutdown.
