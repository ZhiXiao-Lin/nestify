# @a3s-lab/redisson

NestJS module wrapper and option helpers for Redis-backed Redisson usage.

## Install

```bash
pnpm add @a3s-lab/redisson ioredis node-redisson
```

## Use

```ts
import { RedissonModule, createRedissonModuleOptions } from '@a3s-lab/redisson';

@Module({
    imports: [
        RedissonModule.register(
            createRedissonModuleOptions({
                host: 'localhost',
                port: 6379,
                db: 0,
            }),
        ),
    ],
})
export class AppModule {}
```

`createRedissonModuleOptions` builds single-node Redis options for the existing module. Applications still own concrete environment variable names, key naming, cache policy, and lock usage.
