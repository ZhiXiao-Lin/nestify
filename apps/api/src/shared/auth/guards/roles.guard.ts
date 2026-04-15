// ============================================================================
// Roles Guard - Checks user roles
// ============================================================================

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac/rbac.service';
import { JwtPayload } from '../jwt/jwt.types';

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Require specific roles to access route
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Roles Guard - checks if user has required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbacService: RbacService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as JwtPayload;

        if (!user || !user.roles) {
            throw new ForbiddenException('Access denied: No roles assigned');
        }

        const hasRole = this.rbacService.hasAnyRole(user.roles, requiredRoles);
        if (!hasRole) {
            throw new ForbiddenException(
                `Access denied: Required role(s): ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}
