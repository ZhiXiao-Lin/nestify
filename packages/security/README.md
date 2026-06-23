# @a3s-lab/security

Reusable security decorators, guards, and validation helpers for NestJS APIs.

## Install

```bash
pnpm add @a3s-lab/security
pnpm add @nestjs/common @nestjs/core express
```

## Use

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuardDelegate, Public, SecurityModule } from '@a3s-lab/security';

@Injectable()
class ApiAuthGuard implements AuthGuardDelegate {
    canActivate() {
        return true;
    }
}

SecurityModule.register({
    authGuardDelegate: ApiAuthGuard,
});

class HealthController {
    @Public()
    check() {
        return { ok: true };
    }
}
```

## Exports

- Default-deny authentication guard and delegate token
- `@Public()` metadata
- Development-only guard helpers
- Path validation utilities
- Sensitive operation metadata
- JWT payload types

## Notes

This package provides generic guard composition. Token verification, user shape, roles, permissions, and policy defaults belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
