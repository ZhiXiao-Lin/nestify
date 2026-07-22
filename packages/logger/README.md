# @a3s-lab/logger

Security-conscious structured logging for NestJS with Pino, bounded request metadata, and AsyncLocalStorage request context.

## Install

```bash
pnpm add @a3s-lab/logger @nestjs/common rxjs
```

## Use

Register the module once. It is global by default; set `isGlobal: false` when the providers should remain local.

```ts
import { Module } from '@nestjs/common';
import { LoggerModule, createLoggerModuleOptions } from '@a3s-lab/logger';

@Module({
    imports: [
        LoggerModule.register(
            createLoggerModuleOptions({
                level: 'info',
                name: 'orders-api',
                json: true,
                base: { region: 'cn-east-1' },
                redact: ['credentials.secret'],
                interceptor: {
                    excludePaths: ['/health', '/metrics'],
                },
            }),
        ),
    ],
})
export class AppModule {}
```

`registerAsync` supports configuration providers without creating duplicate logger tokens:

```ts
LoggerModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        name: config.getOrThrow('SERVICE_NAME'),
        level: config.get('LOG_LEVEL') ?? 'info',
        json: config.get('LOG_JSON') !== 'false',
    }),
});
```

Inject either compatibility name; both refer to the same Nest token.

```ts
import { Injectable } from '@nestjs/common';
import { Logger } from '@a3s-lab/logger';

@Injectable()
export class RebuildService {
    constructor(private readonly logger: Logger) {}

    run(requestId: string) {
        this.logger.info('index rebuild started', { requestId });
    }
}
```

Pino receives structured context as its first argument and the message as its second, so fields remain queryable rather than becoming formatting arguments. `write(level, message, context)` is the unambiguous level-aware API; Nest-compatible `log`, `error`, `warn`, `debug`, and `verbose` methods remain available.

### Request context

Use an explicit context lifetime for jobs and non-HTTP entry points:

```ts
await Logger.runWithContext({ requestId, actorId }, async () => {
    await rebuildIndex();
});
```

Nested contexts merge with the current context and are restored when the callback finishes. `getRequestContext()` returns a copy. `setRequestContext()` remains deprecated because `enterWith` has no explicit lifetime.

Child loggers use Pino's native `child()` implementation and inherit the parent level, destination, transport, and redaction rules without starting another pretty-print transport:

```ts
const tenantLogger = logger.child({ tenantId: 'tenant-1' });
tenantLogger.info('tenant cache refreshed');
```

### HTTP interceptor

Register the exported provider as a global interceptor when HTTP request timing and context are required:

```ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule, LoggingInterceptor } from '@a3s-lab/logger';

@Module({
    imports: [
        LoggerModule.register({
            name: 'orders-api',
            interceptor: {
                logRequestHeaders: false,
                logRequestBody: false,
                logResponseBody: false,
            },
        }),
    ],
    providers: [{ provide: APP_INTERCEPTOR, useExisting: LoggingInterceptor }],
})
export class AppModule {}
```

The interceptor:

- creates the Observable subscription inside `AsyncLocalStorage.run`, keeping concurrent request contexts isolated;
- accepts only bounded printable request ids and otherwise generates a UUID;
- returns the normalized id in `x-request-id` unless disabled or already set;
- removes query strings and fragments before logging URLs;
- uses Express `request.ip`, so proxy headers are trusted only when the application configures Express trust proxy;
- keeps context available on excluded health/metrics paths while suppressing their request log;
- logs one completion or error record, including for multi-value Observables and synchronous failures;
- bounds logged header count, header value count, and header length.

Request headers and bodies are not logged by default. Enabling them is an explicit privacy decision; default redaction still applies to common authorization, cookie, password, token, and API-key fields.

### Redaction and metadata integrity

Default redaction paths are always combined with application paths. Set `redact: false` only when deliberately disabling these safety defaults. `redactionCensor` changes the replacement string.

Pino-owned fields such as `level`, `msg`, `err`, `service`, and `time` are rejected in base configuration. The same fields supplied dynamically are preserved under `contextFields`, preventing request data from spoofing log severity or service identity.

Invalid configuration throws `LoggerConfigurationError` before the logger or interceptor begins handling traffic.

## Exports

- `LoggerModule`, `LoggerServiceImpl`, and the `Logger` compatibility name
- `LoggingInterceptor`
- `createLoggerModuleOptions`, `normalizeLoggerModuleOptions`, and `normalizeLogInterceptorOptions`
- Default redaction, exclusion-path, and request-id constants
- Log context, request input, module, interceptor, normalized option, and level types
- `LoggerConfigurationError` and configurable module definition helpers

## Notes

Applications own log retention, transport destinations, environment-specific levels, Express trust-proxy policy, and authorization around sensitive logs. Avoid enabling body logging for secrets or large streaming payloads. The package removed its unused `pino-http` dependency; HTTP integration is implemented directly as a Nest interceptor.
