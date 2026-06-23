# @a3s-lab/http

HTTP API contracts, response envelopes, validation, business errors, request IDs, pagination, API versioning, and OpenAPI helpers for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/http @a3s-lab/ddd
pnpm add @nestjs/common @nestjs/core @nestjs/swagger class-transformer class-validator express rxjs
```

## Use

```ts
import { ApiResponseInterceptor, BusinessException, StatusCode, parsePaginationOptions } from '@a3s-lab/http';

const page = parsePaginationOptions({ page: 1, limit: 20 });

if (page.limit > 100) {
    throw new BusinessException({
        code: StatusCode.VALIDATION_ERROR,
        message: 'Page size is too large',
    });
}
```

Register `ApiResponseInterceptor`, `BusinessExceptionFilter`, and validation pipes using the NestJS provider style that fits your API.

## Exports

- Response DTOs, pagination helpers, and response wrapping interceptor
- Business exceptions and error filter
- Validation pipes and DTO helpers
- Request/correlation ID helpers
- OpenAPI decorators and API versioning metadata

## Notes

This package defines generic HTTP API behavior. Keep endpoint-specific DTOs and application messages in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
