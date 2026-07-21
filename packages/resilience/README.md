# @a3s-lab/resilience

Validated retry, circuit-breaker, cache, rate-limit, and distributed-lock building blocks for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/resilience @a3s-lab/redisson
pnpm add @nestjs/common @nestjs/core express rxjs
```

## Use

Redis-backed providers must be able to resolve the same `RedissonService` instance. Reuse the configured dynamic
module in `ResilienceModule.register({ imports })`; importing Redisson only as an unrelated sibling module does not
establish that Nest dependency edge.

```ts
import { Module } from '@nestjs/common';
import { RedissonModule, createRedissonModuleOptions } from '@a3s-lab/redisson';
import { Cache, RateLimitAuth, ResilienceModule } from '@a3s-lab/resilience';

const redisModule = RedissonModule.register(
    createRedissonModuleOptions({
        host: 'localhost',
        port: 6379,
    }),
);

@Module({
    imports: [
        redisModule,
        ResilienceModule.register({
            imports: [redisModule],
            isGlobal: true,
            globalInterceptors: true,
            globalRateLimitingGuard: true,
            rateLimiting: {
                backendFailureMode: 'local',
                maxLocalEntries: 10_000,
            },
        }),
    ],
})
export class AppModule {}

class CatalogController {
    @RateLimitAuth()
    @Cache({
        ttl: 60,
        scope: 'private',
        varyByHeaders: ['x-feature-variant'],
    })
    loadCatalog() {
        return { available: true };
    }
}
```

Applications that need only retry and circuit breaking can avoid the Redis dependency at runtime:

```ts
ResilienceModule.register({
    redisBackedFeatures: false,
});
```

### Retry and cancellation

Every retry option is validated. When `retryableErrors` or `isRetryable` is supplied, only matching errors are
retried; the default remains retry-all when neither filter is configured. Backoff plus jitter never exceeds
`maxDelay`. `AbortSignal` stops new attempts and interruptible backoff waits; pass the same signal to the underlying
client when an active request must also be cancelled.

```ts
const controller = new AbortController();

const result = await retry.executeOrThrow(
    () => fetch('https://example.com', { signal: controller.signal }),
    {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 2_000,
        jitterRatio: 0.25,
        signal: controller.signal,
        isRetryable: error => error instanceof TypeError,
    },
);
```

`RetryAbortedError` is propagated directly by `executeOrThrow()`. Exhaustion throws `RetryExhaustedError` with the
last failure available as both `lastError` and `cause`.

### Circuit breaking

Failure thresholds count consecutive failures. A success in the closed state resets that sequence. After
`resetTimeout`, the breaker admits at most `halfOpenMaxAttempts` concurrent probes (one by default), preventing a
recovery thundering herd. Late results from calls that started before another call opened the circuit do not close or
extend it. Stats return defensive `Date` copies, and the service rejects new circuits after Nest destroys it.

### Cache behavior

`CacheService.getOrSet()` coalesces concurrent misses for the same fully-qualified key. Explicit `set()` and `delete()`
invalidate older loads, so a slow factory cannot overwrite a newer authoritative mutation. Versioned envelopes retain
JSON-looking strings and null values without confusing them with misses. Keys, prefixes, TTLs, serialized values, and
decorator options are validated.

Cache decorators are private by default: keys vary by route inputs, host, inferred tenant, representation headers,
authenticated identity, authorization, cookies, and API keys. Request-derived material is SHA-256 hashed and never
written verbatim to Redis keys or failure logs. Canonical key generation limits depth, value count, and scalar/binary
material to bound CPU and memory consumption. Use `scope: 'public'` only for responses intentionally shared across
authenticated identities; public entries still vary by tenant and host.

Key-generation and Redis failures bypass caching by default. Set `skipOnError: false` for strict behavior. Shutdown is
idempotent, waits for already-started cache operations, resets statistics, rejects new work, and never closes the
injected Redisson connection owned by another module.

`TtlCache` validates its TTL and capacity, coalesces loads, preserves cached `undefined`, prevents stale load writes
after `set()`, `delete()`, or `clear()`, and evicts in bounded insertion order.

### Rate limiting

The global guard acts only on routes carrying `@RateLimit()`, `@RateLimitAuth()`, `@RateLimitApi()`, or
`@RateLimitUpload()`. Identity prefers an authenticated subject, then Express `request.ip`; configure Express
`trust proxy` for known proxies rather than reading `x-forwarded-for` directly. A verified `identifierExtractor` can
supply another identity. Missing, oversized, or control-character identifiers fail closed.

Redis uses one atomic sliding-window script. The script inserts only admitted requests, bounding each sorted set by
the configured limit even during denial floods. Policy namespaces are validated, and identifiers are SHA-256 hashed.
Malformed or inconsistent Redis replies use the configured backend-failure policy instead of producing invalid dates
or headers. `backendFailureMode` selects bounded per-process `local` fallback (the default), explicit `allow`, or
explicit `deny`; choose `deny` when a shared limiter is a hard security requirement.

### Distributed locks

Lock keys and timing options are validated. Request template values such as `{{params.id}}` must exist, be primitive,
and are SHA-256 hashed before they reach Redis. Missing fields, accessors, unsupported templates, and unsafe Redis hash
tag braces fail closed.

The service always asks the underlying ownership-aware lock to unlock directly. Acquisition failures return
`DistributedLockAcquisitionError`; a release failure turns an otherwise successful call into a failed result instead
of being silently logged. If both the callback and release fail, `DistributedLockCleanupError` preserves both causes.

## Exports

- Retry service, decorator, interceptor, cancellation error, and exhausted error
- Circuit-breaker service, instance, states, stats, decorator, interceptor, and lifecycle/open errors
- Redis-backed cache service, interceptor, decorators, stats, lifecycle error, and local `TtlCache`
- Rate-limit policies, storage-key helper, guard, service, decorators, result types, and exceeded exception
- Distributed-lock service, decorator, interceptor, discriminated result, and acquisition/release/cleanup errors
- `ResilienceModule` and `ResilienceModuleOptions`

## Notes

The module never creates or closes a Redis client. The importing application owns `RedissonModule` configuration and
lifecycle. Resilience providers own only their policy state and drain/reset that state during Nest shutdown. Changing
cache namespaces, rate-limit policies, or lock-key templates changes coordination keys and should be deployed as an
intentional cache/coordination migration.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
