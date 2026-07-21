# @a3s-lab/http

Bounded HTTP contracts, response envelopes, strict validation, business errors, request IDs, pagination, DTO serialization, collision-safe key transforms, configurable API versioning/error handling, and OpenAPI helpers for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/http @a3s-lab/ddd
pnpm add @nestjs/common @nestjs/core @nestjs/swagger class-transformer class-validator express rxjs
```

## Use

Register one response envelope, the version policy, and the global error filter in the application module:

```ts
import {
    ApiResponseModule,
    ApiVersioningModule,
    ErrorsModule,
} from '@a3s-lab/http';

@Module({
    imports: [
        ApiResponseModule,
        ApiVersioningModule.register({
            supportedVersions: ['1', '2'],
            defaultVersion: '1',
            bypassPathPrefixes: ['/health'],
        }),
        ErrorsModule.register({
            exposeHttp5xxMessages: false,
            includeDetails: true,
        }),
    ],
})
export class AppModule {}
```

Use the package validation contract at bootstrap. It enables transformation, implicit conversion, allow-listing, rejection of unknown values/properties, and the standard validation error shape:

```ts
import { createValidationPipe } from '@a3s-lab/http';

app.useGlobalPipes(createValidationPipe());
```

Pagination helpers reject fractional, negative, zero, oversized, and unsafe-integer input:

```ts
import { BusinessException, StatusCode, parsePaginationOptions } from '@a3s-lab/http';

const { limit, offset } = parsePaginationOptions({ page: 1, limit: 20 });

throw new BusinessException({
    code: StatusCode.BUSINESS_RULE_VIOLATION,
    message: 'Order cannot be confirmed',
    details: { orderId: 'order-1' },
});
```

Key conversion is explicit and bounded. A collision such as `user_id` plus `userId`, a circular structure, or an exhausted depth/entry budget fails with `VALIDATION_ERROR` instead of silently overwriting data:

```ts
import { Serializer, transformKeysToCamelCase } from '@a3s-lab/http';

class ResourceSerializer extends Serializer<{ id: string }, { id: string }> {
    toDto(entity: { id: string }) {
        return { id: entity.id };
    }
}

const input = transformKeysToCamelCase(
    { resource_id: 'resource-1' },
    { maxDepth: 16, maxEntries: 1_000 },
);
```

`TransformModule` is an optional generic wrapper and supports `register()`/`registerAsync()`. Do not register it beside `ApiResponseModule` unless the extra nested wrapper and `_meta` payload are intentional. `ErrorsModule` already installs `GlobalErrorFilter`; the compatibility `DomainExceptionFilter`, `HttpExceptionFilter`, and `LoggingInterceptor` exports are deprecated and should not be registered in new applications.

## Exports

- Response DTOs, pagination helpers, and response wrapping interceptor
- Business exceptions, bounded public details, and configurable global error filtering
- Strict validation pipes, defensive validation formatting, and reusable DTO decorators
- Syntax- and length-checked request/correlation ID helpers
- Nest modules for API responses, API versioning, errors, serialization, and transforms
- Deprecated compatibility domain/http filters and request logging interceptor
- Serializer, mapper, and class-transformer helpers
- Key transform helpers and transform interceptors
- OpenAPI decorators and API versioning metadata

## Notes

This package defines generic HTTP API behavior. Request paths written to logs never contain query strings, generic 5xx messages are private by default, and configurable modules validate their policy before serving traffic. Keep endpoint-specific DTOs, application messages, authentication policy, and logging sinks in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
