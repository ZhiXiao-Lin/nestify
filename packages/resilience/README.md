# @a3s-lab/resilience

Retry, circuit breaker, cache, rate limit, and distributed lock utilities for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/resilience @a3s-lab/redisson
pnpm add @nestjs/common @nestjs/core express rxjs
```

## Use

```ts
import { Cache, RateLimitAuth, ResilienceModule, Retry, RetryService, TtlCache } from '@a3s-lab/resilience';

ResilienceModule.register({
    globalInterceptors: true,
    globalRateLimitingGuard: true,
    rateLimiting: {
        backendFailureMode: 'local',
        maxLocalEntries: 10_000,
    },
});

class RemoteClient {
    constructor(private readonly retry: RetryService) {}

    @Retry({ maxAttempts: 3, initialDelay: 100 })
    async load() {
        return this.retry.executeOrThrow(() => fetch('https://example.com').then(response => response.json()));
    }
}

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

const localCache = new TtlCache<string>(30_000);
```

## Exports

- Retry service, decorator, interceptor, and exhausted error
- Circuit breaker service, decorator, and interceptor
- Redis-backed cache service and local TTL cache
- Rate limiting guard and service
- Distributed lock service, decorator, and interceptor
- `ResilienceModule`

## Notes

Redis-backed features require `@a3s-lab/redisson` in the consuming application. Cache decorators are private by
default: keys vary by route inputs, host, inferred tenant, common representation headers, authenticated identity,
authorization, cookies, and API keys. Request-derived material is SHA-256 hashed and is not written verbatim to Redis
keys or failure logs. Header names are case-normalized; use `varyByHeaders` for application-specific representation
headers.

Choose `scope: 'public'` only when a response is intentionally shared across authenticated identities. Public entries
still vary by an inferred tenant (`request.tenant`, `tenantId`, `organizationId`, common user/auth claim fields, or
`x-tenant-id`) and host. Applications with another tenancy model should expose a verified tenant through one of those
request fields before enabling public caching.

Cache key generation and Redis failures bypass caching by default so a cache outage does not fail a successful request;
set `skipOnError: false` for strict behavior. Nest shutdown waits for Redis cache operations that have already started,
then rejects new cache operations without closing the injected Redisson connection.

The rate-limit guard is global by default, but only routes carrying `@RateLimit()`, `@RateLimitAuth()`,
`@RateLimitApi()`, or `@RateLimitUpload()` metadata are limited. Client identity uses the authenticated subject first,
then Express `request.ip`; configure Express `trust proxy` for known proxies instead of trusting
`x-forwarded-for` directly. `identifierExtractor` can provide another verified identity. Redis checks use an atomic
single-key sliding-window script, and built-in policies use separate key namespaces. Identifiers are SHA-256 hashed in
storage keys.

When Redis fails, `backendFailureMode` selects a bounded per-process `local` fallback (the default), explicit `allow`,
or explicit `deny`. The local fallback is intentionally weaker in a multi-replica deployment but cannot grow beyond
`maxLocalEntries`; choose `deny` when a shared limiter is a hard security requirement. Set
`globalRateLimitingGuard: false` only when installing `RateLimitingGuard` manually.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
