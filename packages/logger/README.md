# @a3s-lab/logger

Structured logging primitives for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/logger @nestjs/common rxjs
```

## Use

```ts
import { LoggerModule } from '@a3s-lab/logger';

@Module({
    imports: [
        LoggerModule.register({
            level: 'info',
            name: 'api',
            json: true,
            redact: ['req.headers.authorization'],
        }),
    ],
})
export class AppModule {}
```

Inject the logger in services:

```ts
import { Injectable } from '@nestjs/common';
import { Logger } from '@a3s-lab/logger';

@Injectable()
export class ExampleService {
    constructor(private readonly logger: Logger) {}

    run() {
        this.logger.info('operation completed', { requestId: 'request-1', actorId: 'actor-1' });
    }
}
```

## Exports

- `LoggerModule`
- `Logger`
- `LoggingInterceptor`
- Log context, log level, logger options, and module option types
- Configurable module definition helpers

## Notes

`LoggingInterceptor` can be registered as a Nest interceptor when request/response timing should be captured. The package keeps context generic: applications may add their own fields through the open `LogContext` shape.
