// ============================================================================
// Base Entity Interface - Common properties for all entities
// ============================================================================

export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TenantEntity extends BaseEntity {
    organizationId: string;
}

export interface SoftDeleteEntity extends BaseEntity {
    deletedAt?: Date;
    deletedBy?: string;
}

export interface VersionedEntity extends BaseEntity {
    version: number;
}
