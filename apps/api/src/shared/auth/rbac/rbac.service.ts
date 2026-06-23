// ============================================================================
// RBAC - Role-Based Access Control
// ============================================================================

import { Injectable } from '@nestjs/common';

/**
 * Permission definition
 */
export interface Permission {
    resource: string;
    actions: string[]; // e.g., ['create', 'read', 'update', 'delete']
}

/**
 * Role definition
 */
export interface Role {
    name: string;
    permissions: Permission[];
}

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
export class RbacService {
    private readonly roles: Map<string, Role> = new Map();

    constructor() {
        // Initialize default roles
        for (const role of DEFAULT_ROLES) {
            this.roles.set(role.name, role);
        }
    }

    /**
     * Get role by name
     */
    getRole(roleName: string): Role | undefined {
        return this.roles.get(roleName);
    }

    /**
     * Check if a role has a specific permission
     */
    hasPermission(roleName: string, resource: string, action: string): boolean {
        const role = this.getRole(roleName);
        if (!role) {
            return false;
        }

        const permission = role.permissions.find(p => p.resource === resource);
        if (!permission) {
            return false;
        }

        return permission.actions.includes(action) || permission.actions.includes('*');
    }

    /**
     * Check if any of the roles has a specific permission
     */
    hasAnyPermission(roleNames: string[], resource: string, action: string): boolean {
        return roleNames.some(roleName => this.hasPermission(roleName, resource, action));
    }

    /**
     * Check if all roles have a specific permission
     */
    hasAllPermissions(roleNames: string[], resource: string, action: string): boolean {
        return roleNames.every(roleName => this.hasPermission(roleName, resource, action));
    }

    /**
     * Get all permissions for a role
     */
    getPermissions(roleName: string): Permission[] {
        const role = this.getRole(roleName);
        return role?.permissions ?? [];
    }

    /**
     * Register a custom role
     */
    registerRole(role: Role): void {
        this.roles.set(role.name, role);
    }

    /**
     * Check if user has role
     */
    hasRole(userRoles: string[], requiredRole: string): boolean {
        return userRoles.includes(requiredRole);
    }

    /**
     * Check if user has any of the roles
     */
    hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
        return userRoles.some(role => requiredRoles.includes(role));
    }
}
