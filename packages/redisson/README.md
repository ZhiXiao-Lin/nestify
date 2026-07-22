# @a3s-lab/redisson

Lifecycle-safe NestJS helpers for Redis caching, incremental key cleanup, and `node-redisson` distributed locks.

## Install

```bash
pnpm add @a3s-lab/redisson ioredis node-redisson
```

The package requires TypeScript 5.7.2 or newer to match the `node-redisson` declaration baseline.

## Use

```ts
import { Module } from '@nestjs/common';
import { RedissonModule, createRedissonModuleOptions } from '@a3s-lab/redisson';

@Module({
    imports: [
        RedissonModule.register(
            createRedissonModuleOptions({
                host: 'localhost',
                port: 6379,
                db: 0,
                keyPrefix: 'orders:',
                lockWatchdogTimeout: 30_000,
                shutdownTimeoutMs: 10_000,
                patternScanCount: 250,
                patternDeleteBatchSize: 50,
            }),
        ),
    ],
})
export class AppModule {}
```

`createRedissonModuleOptions` rejects invalid ports, database indexes, watchdog durations, scan sizes, batch sizes, and shutdown timeouts before a client is created. `registerAsync` remains available for configuration providers.

## Cache helpers

```ts
import { Injectable } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

@Injectable()
export class ProductCache {
    constructor(private readonly redis: RedissonService) {}

    getProduct(id: string) {
        return this.redis.getOrSet(`product:${id}`, () => loadProduct(id), 300);
    }
}
```

Concurrent `getOrSet` misses for the same key share one local factory promise. Empty strings are valid hits, JSON-shaped strings retain their string type, failed factories are never cached, and a late factory cannot overwrite a newer write made through the service. TTL values are positive integer seconds; `0` is rejected instead of silently creating a persistent entry.

The service also exposes validated raw string, JSON, hash, counter, Lua, existence, expiration, and delete helpers. `getRedis()` provides the underlying ioredis client for operations outside the helper surface.

## Locks

Use `withLock` when the protected operation fits in one callback:

```ts
await redis.withLock(
    `checkout:${orderId}`,
    () => checkout(orderId),
    5_000,
    30_000,
);
```

If the callback and unlock both fail, the callback error remains the primary error and the unlock failure is logged. If a successful callback cannot release its lock, `RedissonLockReleaseError` is thrown because lock ownership is uncertain.

For manually scoped locks, pair calls on the same service instance:

```ts
if (await redis.tryLock('maintenance', 1_000, 30_000)) {
    try {
        await runMaintenance();
    } finally {
        await redis.unlock('maintenance');
    }
}
```

The service retains the exact lock identity acquired by `tryLock`, prevents overlapping local acquisitions for that key, and releases still-managed locks during shutdown. Use `getLock()` directly only when the application owns the returned lock object and its complete lifecycle.

## Incremental pattern deletion

```ts
const deleted = await redis.deleteByPattern('session:*', {
    scanCount: 250,
    batchSize: 50,
    useUnlink: true,
});
```

`deleteByPattern` uses cursor-based `SCAN`; it never issues blocking `KEYS`. It scans every master in cluster mode and defaults to non-blocking `UNLINK`, with bounded command concurrency. Patterns are logical names, so a configured ioredis `keyPrefix` is escaped and applied exactly once. A partial failure throws `RedissonPatternDeleteError` with `deletedCount` and per-key failures.

Redis `SCAN` is incremental rather than snapshot-isolated. Coordinate external writers when an operation requires a strict all-keys deletion boundary.

## Shutdown guarantees

- New service helper operations and `getRedis()` access are rejected once shutdown starts.
- Accepted helper operations get a bounded drain window before Redis closes.
- Managed locks get their own bounded release window.
- Locks acquired after a forced-close timeout are immediately released and never run their callback.
- `shutdown`, `quit`, and Nest's `onModuleDestroy` share one idempotent close operation.
- A failed startup ping closes the clients before the failure is rethrown.

## Exports

- `RedissonModule` and `RedissonService`
- `createRedissonModuleOptions`
- Cache, scan, lock, lifecycle, and structured error contracts
- Public `node-redisson` and `ioredis` APIs

## Notes

Applications still own Redis topology, credentials, key naming, cache policy, and cross-process coordination.
