# @a3s-lab/resilience

Retry, circuit breaker, cache, rate limit, and distributed lock utilities for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/resilience @a3s-lab/redisson
pnpm add @nestjs/common @nestjs/core express rxjs
```

## Use

```ts
import { ResilienceModule, Retry, RetryService, TtlCache } from '@a3s-lab/resilience';

ResilienceModule.register({ globalInterceptors: true });

class RemoteClient {
    constructor(private readonly retry: RetryService) {}

    @Retry({ maxAttempts: 3, initialDelay: 100 })
    async load() {
        return this.retry.executeOrThrow(() => fetch('https://example.com').then(response => response.json()));
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

Redis-backed features require `@a3s-lab/redisson` in the consuming application. Keys, limits, and failure policies should be chosen by the API that owns the endpoint.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
