# @a3s-lab/etcd

NestJS module and service helpers for etcd-backed distributed configuration, watches, leases, and health checks.

## Install

```bash
pnpm add @a3s-lab/etcd @nestjs/common etcd3
```

## Use

```ts
import { EtcdModule } from '@a3s-lab/etcd';

@Module({
    imports: [
        EtcdModule.register({
            endpoints: ['http://localhost:2379'],
            requestOptions: {
                timeout: 5000,
                retry: 3,
            },
            configCache: {
                ttl: 5000,
                maxEntries: 1000,
                cacheMissing: true,
            },
        }),
    ],
})
export class AppModule {}
```

Inject the services to read configuration, write values, watch changes, and manage leases:

```ts
import { Injectable } from '@nestjs/common';
import { EtcdConfigService, EtcdService } from '@a3s-lab/etcd';

@Injectable()
export class SettingsStore {
    constructor(
        private readonly etcd: EtcdService,
        private readonly config: EtcdConfigService,
    ) {}

    async readSettings() {
        return this.config.getJSON<{ enabled: boolean }>('settings/api');
    }

    async writeSettings(enabled: boolean) {
        await this.config.setJSON('settings/api', { enabled });
    }

    watchSettings() {
        return this.config.subscribe<string>('settings/api', value => {
            // Deletions are delivered as null so consumers can remove stale state.
            applySettings(value === null ? null : JSON.parse(value));
        });
    }

    async writeTemporaryValue() {
        const leaseId = await this.etcd.grantLease(30);
        await this.etcd.set('settings/temporary', 'enabled', { lease: leaseId });
    }
}
```

Keep the function returned by `watch`, `watchPrefix`, `subscribe`, or `subscribePrefix` and call it when the consumer no longer needs updates. Watch values are the raw UTF-8 strings stored by etcd; parse JSON in the subscriber when needed. Multiple configuration subscribers for the same key or prefix share one underlying etcd watcher. Subscriber failures are logged and isolated, so one synchronous or asynchronous callback cannot prevent the remaining subscribers from running.

## Configuration

| Option | Default | Behavior |
| --- | --- | --- |
| `endpoints` | required | One or more non-empty etcd URLs. |
| `auth` | none | Username and password must be supplied together. |
| `tls` | none | Client certificate and key must be supplied together; `ca` is optional. |
| `requestOptions.timeout` | etcd3 default | Deadline in milliseconds for non-streaming RPCs. Watch streams are not given a finite request deadline. |
| `requestOptions.retry` | etcd3 default | Number of retries for recoverable RPC failures. Set to `0` to disable global retries. |
| `configCache.ttl` | `5000` | Local cache lifetime in milliseconds. Set to `0` to disable caching. |
| `configCache.maxEntries` | `1000` | Maximum typed cache entries per service instance. Set to `0` to disable caching. |
| `configCache.cacheMissing` | `true` | Cache missing keys for the configured TTL to coalesce repeated misses. |

Raw and JSON reads use separate cache entries. Concurrent cache misses for the same typed key share one request, write/watch/delete events invalidate stale entries, and late reads cannot overwrite newer watch updates. TTL writes never outlive the shorter of the etcd lease TTL and local cache TTL.

## Lifecycle guarantees

- Duplicate `EtcdService.watch()` calls for the same key remain independently cancellable.
- Watch creation, cancellation, and callback failures are logged without leaking unhandled promises.
- Shutdown attempts every watcher and lease cleanup even when one cleanup fails, then closes the client exactly once.
- Anonymous TTL writes and compare-and-set leases release local keepalive resources after the operation.
- Lease TTLs must be positive integers; `ttl` and an existing `lease` cannot be combined on one write.

## Exports

- `EtcdModule`
- `EtcdService`
- `EtcdConfigService`
- Connection, watch, lease, compare-and-set, health, and module option types

## Notes

The package owns generic etcd client creation, key-value operations, prefix reads, JSON helpers, bounded local config caching, shared watches, leases, compare-and-set, cluster health, and lifecycle cleanup. Applications still own key naming, value schemas, cache policy overrides, and change-handling behavior.
