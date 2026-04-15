// ============================================================================
// Permissions Guard - Checks user permissions (RBAC)
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
 * Metadata key for required permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific permissions to access route
 * Format: 'resource:action' e.g., 'users:read', 'workflows:delete'
 */
export const Permissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permissions Guard - checks if user has required permissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly rbacService: RbacService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as JwtPayload;

        if (!user || !user.roles) {
            throw new ForbiddenException('Access denied: No permissions assigned');
        }

        for (const permission of requiredPermissions) {
            const [resource, action] = permission.split(':');
            const hasPermission = this.rbacService.hasAnyPermission(
                user.roles,
                resource,
                action,
            );

            if (!hasPermission) {
                throw new ForbiddenException(
                    `Access denied: Missing permission '${permission}'`,
                );
            }
        }

        return true;
    }
}
