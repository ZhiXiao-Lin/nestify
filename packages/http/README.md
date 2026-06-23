# @a3s-lab/http

HTTP API contracts, response envelopes, validation, business errors, request IDs, pagination, DTO serialization helpers, response/key transforms, presentation filters/interceptors, API versioning, and OpenAPI helpers for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/http @a3s-lab/ddd
pnpm add @nestjs/common @nestjs/core @nestjs/swagger class-transformer class-validator express rxjs
```

## Use

```ts
import {
    ApiResponseModule,
    ApiVersioningModule,
    BusinessException,
    ErrorsModule,
    StatusCode,
    parsePaginationOptions,
} from '@a3s-lab/http';

const page = parsePaginationOptions({ page: 1, limit: 20 });

if (page.limit > 100) {
    throw new BusinessException({
        code: StatusCode.VALIDATION_ERROR,
        message: 'Page size is too large',
    });
}
```

Register the common HTTP modules in a NestJS module, or wire the exported interceptors and filters manually when you need custom behavior.

```ts
@Module({
    imports: [ApiResponseModule, ApiVersioningModule, ErrorsModule],
})
export class AppModule {}
```

```ts
import { DomainException, GlobalErrorFilter, LoggingInterceptor } from '@a3s-lab/http';

class InvalidState extends DomainException {}

app.useGlobalFilters(new GlobalErrorFilter());
app.useGlobalInterceptors(new LoggingInterceptor());
```

```ts
import { Serializer, transformKeysToCamelCase } from '@a3s-lab/http';

class ResourceSerializer extends Serializer<{ id: string }, { id: string }> {
    toDto(entity: { id: string }) {
        return { id: entity.id };
    }
}

const input = transformKeysToCamelCase({ resource_id: 'resource-1' });
```

## Exports

- Response DTOs, pagination helpers, and response wrapping interceptor
- Business exceptions and error filter
- Validation pipes and DTO helpers
- Request/correlation ID helpers
- Nest modules for API responses, API versioning, errors, serialization, and transforms
- Domain/http exception filters and request logging interceptor
- Serializer, mapper, and class-transformer helpers
- Key transform helpers and transform interceptors
- OpenAPI decorators and API versioning metadata

## Notes

This package defines generic HTTP API behavior. Keep endpoint-specific DTOs and application messages in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
