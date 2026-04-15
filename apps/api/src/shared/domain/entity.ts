// ============================================================================
// Entity - Base class for domain entities with identity
// ============================================================================

/**
 * Base class for all domain entities.
 * Entities have identity - two entities with the same ID are considered equal.
 */
export abstract class Entity<T = string> {
    protected readonly _id: T;

    constructor(id: T) {
        this._id = id;
    }

    get id(): T {
        return this._id;
    }

    /**
     * Check equality based on identity
     */
    equals(entity?: Entity<T>): boolean {
        if (entity === null || entity === undefined) {
            return false;
        }

        if (this === entity) {
            return true;
        }

        if (!(entity instanceof Entity)) {
            return false;
        }

        return this._id === entity._id;
    }

    /**
     * Check equality by ID directly (for primitive IDs)
     */
    equalsById(id: T): boolean {
        return this._id === id;
    }

    /**
     * Get the entity's identity as a string (for logging, etc.)
     */
    toString(): string {
        return `${this.constructor.name}:${String(this._id)}`;
    }

    /**
     * Get identity for persistence mapping
     */
    toObject(): { id: T } {
        return { id: this._id };
    }
}

/**
 * Interface for entities with audit fields
 */
export interface IAuditableEntity {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

/**
 * Interface for soft-deletable entities
 */
export interface ISoftDeletable {
    deletedAt?: Date;
    deletedBy?: string;
}

/**
 * Base entity with audit fields
 */
export abstract class AuditableEntity<T = string> extends Entity<T> {
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly createdBy?: string;
    public readonly updatedBy?: string;

    constructor(
        id: T,
        createdAt: Date,
        updatedAt: Date,
        createdBy?: string,
        updatedBy?: string,
    ) {
        super(id);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    /**
     * Check if entity was created after a given date
     */
    isCreatedAfter(date: Date): boolean {
        return this.createdAt > date;
    }

    /**
     * Check if entity was updated after a given date
     */
    isUpdatedAfter(date: Date): boolean {
        return this.updatedAt > date;
    }

    /**
     * Check if entity was updated by a specific user
     */
    isUpdatedBy(userId: string): boolean {
        return this.updatedBy === userId;
    }
}

/**
 * Base entity with soft delete support
 */
export abstract class SoftDeletableEntity<T = string> extends AuditableEntity<T> {
    public readonly deletedAt?: Date;
    public readonly deletedBy?: string;

    constructor(
        id: T,
        createdAt: Date,
        updatedAt: Date,
        deletedAt?: Date,
        deletedBy?: string,
        createdBy?: string,
        updatedBy?: string,
    ) {
        super(id, createdAt, updatedAt, createdBy, updatedBy);
        this.deletedAt = deletedAt;
        this.deletedBy = deletedBy;
    }

    /**
     * Check if entity is deleted
     */
    isDeleted(): boolean {
        return this.deletedAt !== undefined && this.deletedAt !== null;
    }

    /**
     * Check if deleted by a specific user
     */
    isDeletedBy(userId: string): boolean {
        return this.deletedBy === userId;
    }

    /**
     * Get days since deletion
     */
    daysSinceDeletion(): number | null {
        if (!this.deletedAt) return null;
        const now = new Date();
        const diff = now.getTime() - this.deletedAt.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }
}
