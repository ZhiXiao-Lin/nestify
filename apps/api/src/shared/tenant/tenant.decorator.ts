// ============================================================================
// Tenant Decorators
// ============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get current organization ID
 */
export const OrganizationId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const tenantService = ctx.switchToHttp().getRequest().tenantService;
    if (tenantService) {
        return tenantService.getOrganizationId();
    }
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId;
});

/**
 * Get current tenant context
 */
export const Tenant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const tenantService = ctx.switchToHttp().getRequest().tenantService;
    if (tenantService) {
        return tenantService.getContext();
    }
    const request = ctx.switchToHttp().getRequest();
    return {
        organizationId: request.user?.organizationId,
        userId: request.user?.sub,
        roles: request.user?.roles,
    };
});
