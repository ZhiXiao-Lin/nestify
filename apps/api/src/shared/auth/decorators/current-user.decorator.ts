// ============================================================================
// Auth Decorators - Convenience decorators for extracting user info
// ============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../jwt/jwt.types';

/**
 * Get current user from request
 */
export const CurrentUser = createParamDecorator(
    (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload;

        if (!user) {
            return null;
        }

        return data ? user[data] : user;
    },
);

/**
 * Get current user ID
 */
export const CurrentUserId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload;
        return user?.sub;
    },
);

/**
 * Get current organization ID
 */
export const CurrentOrganization = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload;
        return user?.organizationId;
    },
);

/**
 * Get current user roles
 */
export const CurrentRoles = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload;
        return user?.roles ?? [];
    },
);
