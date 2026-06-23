// ============================================================================
// RBAC - Role-Based Access Control
// ============================================================================

import { Injectable } from '@nestjs/common';
import { RolePermissionChecker, type Permission, type Role } from '@a3s-lab/security';

export type { Permission, Role };

/**
 * Default roles and permissions
 */
export const DEFAULT_PERMISSIONS: Permission[] = [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'organizations', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'agents', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'workflows', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'knowledge', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'repositories', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'pipeline', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'audit', actions: ['read'] },
];

export const DEFAULT_ROLES: Role[] = [
    {
        name: 'owner',
        permissions: DEFAULT_PERMISSIONS,
    },
    {
        name: 'admin',
        permissions: DEFAULT_PERMISSIONS.filter(p => p.resource !== 'organizations'),
    },
    {
        name: 'member',
        permissions: [
            { resource: 'users', actions: ['read', 'update'] },
            { resource: 'agents', actions: ['create', 'read', 'update'] },
            { resource: 'workflows', actions: ['create', 'read', 'update'] },
            { resource: 'knowledge', actions: ['create', 'read', 'update'] },
            { resource: 'repositories', actions: ['create', 'read', 'update'] },
            { resource: 'pipeline', actions: ['read'] },
        ],
    },
    {
        name: 'viewer',
        permissions: [
            { resource: 'users', actions: ['read'] },
            { resource: 'agents', actions: ['read'] },
            { resource: 'workflows', actions: ['read'] },
            { resource: 'knowledge', actions: ['read'] },
            { resource: 'repositories', actions: ['read'] },
            { resource: 'pipeline', actions: ['read'] },
        ],
    },
];

/**
 * RBAC Service - handles permission checking
 */
@Injectable()
export class RbacService extends RolePermissionChecker {
    constructor() {
        super(DEFAULT_ROLES);
    }
}
