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
            requestOptions: { timeout: 5000 },
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
        return this.etcd.watch('settings/api', event => {
            if (event.value !== null) {
                applySettings(event.value);
            }
        });
    }

    async writeTemporaryValue() {
        const leaseId = await this.etcd.grantLease(30);
        await this.etcd.set('settings/temporary', 'enabled', { lease: leaseId });
    }
}
```

The package owns generic etcd client creation, key-value operations, prefix reads, JSON helpers, local config caching, watches, leases, compare-and-set, cluster health, and lifecycle cleanup. Applications still own key naming, value schemas, cache TTL policy, and change-handling behavior.
