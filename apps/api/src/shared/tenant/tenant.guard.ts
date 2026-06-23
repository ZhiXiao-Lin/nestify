// ============================================================================
// Tenant Guard - Ensures tenant context is present
// ============================================================================

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantService } from './tenant.service';

/**
 * Tenant Guard - validates that tenant context exists
 */
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.organizationId) {
            throw new UnauthorizedException('Tenant context not available');
        }

        // Set tenant context
        this.tenantService.setContext({
            organizationId: user.organizationId,
            userId: user.sub,
            roles: user.roles,
        });

        return true;
    }
}

/**
 * Tenant Guard with optional context (doesn't throw if no tenant)
 */
@Injectable()
export class OptionalTenantGuard implements CanActivate {
    constructor(private readonly tenantService: TenantService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user?.organizationId) {
            this.tenantService.setContext({
                organizationId: user.organizationId,
                userId: user.sub,
                roles: user.roles,
            });
        }

        return true;
    }
}
