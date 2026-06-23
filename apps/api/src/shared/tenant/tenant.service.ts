// ============================================================================
// Tenant Service - Multi-tenancy context management
// ============================================================================

import { Injectable, Scope } from '@nestjs/common';

/**
 * Tenant context - contains current tenant information
 */
export interface TenantContext {
    organizationId: string;
    userId?: string;
    roles?: string[];
    metadata?: Record<string, unknown>;
}

/**
 * Tenant Service - provides access to current tenant context
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantService {
    private context: TenantContext | null = null;

    /**
     * Set tenant context
     */
    setContext(context: TenantContext): void {
        this.context = context;
    }

    /**
     * Get current organization ID
     */
    getOrganizationId(): string {
        if (!this.context?.organizationId) {
            throw new Error('Tenant context not available');
        }
        return this.context.organizationId;
    }

    /**
     * Get current user ID
     */
    getUserId(): string | undefined {
        return this.context?.userId;
    }

    /**
     * Get tenant context
     */
    getContext(): TenantContext | null {
        return this.context;
    }

    /**
     * Check if tenant context is available
     */
    hasContext(): boolean {
        return this.context !== null && !!this.context.organizationId;
    }

    /**
     * Get metadata value
     */
    getMetadata<T>(key: string): T | undefined {
        return this.context?.metadata?.[key] as T;
    }
}

/**
 * Request-scoped storage for tenant context
 */
export class TenantStorage {
    private static instance: TenantContext | null = null;

    static set(context: TenantContext): void {
        TenantStorage.instance = context;
    }

    static get(): TenantContext | null {
        return TenantStorage.instance;
    }

    static clear(): void {
        TenantStorage.instance = null;
    }
}
