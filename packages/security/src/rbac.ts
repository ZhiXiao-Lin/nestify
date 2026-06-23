export interface Permission {
    resource: string;
    actions: string[];
}

export interface Role {
    name: string;
    permissions: Permission[];
}

export class RolePermissionChecker {
    private readonly roles = new Map<string, Role>();

    constructor(initialRoles: Role[] = []) {
        this.registerRoles(initialRoles);
    }

    getRole(roleName: string): Role | undefined {
        return this.roles.get(roleName);
    }

    getRoles(): Role[] {
        return Array.from(this.roles.values());
    }

    getPermissions(roleName: string): Permission[] {
        return this.getRole(roleName)?.permissions ?? [];
    }

    registerRole(role: Role): void {
        this.roles.set(role.name, role);
    }

    registerRoles(roles: Role[]): void {
        for (const role of roles) {
            this.registerRole(role);
        }
    }

    hasPermission(roleName: string, resource: string, action: string): boolean {
        const permission = this.getPermissions(roleName).find(candidate => candidate.resource === resource);
        return permission?.actions.includes(action) === true || permission?.actions.includes('*') === true;
    }

    hasAnyPermission(roleNames: string[], resource: string, action: string): boolean {
        return roleNames.some(roleName => this.hasPermission(roleName, resource, action));
    }

    hasAllPermissions(roleNames: string[], resource: string, action: string): boolean {
        return roleNames.every(roleName => this.hasPermission(roleName, resource, action));
    }

    hasRole(userRoles: string[], requiredRole: string): boolean {
        return userRoles.includes(requiredRole);
    }

    hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
        return userRoles.some(role => requiredRoles.includes(role));
    }
}
