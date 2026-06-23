import { Entity } from './entity';

export interface IAuditableEntity {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

export interface ISoftDeletable {
    deletedAt?: Date;
    deletedBy?: string;
}

export abstract class AuditableEntity<T = string> extends Entity<T> {
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly createdBy?: string;
    public readonly updatedBy?: string;

    constructor(id: T, createdAt: Date, updatedAt: Date, createdBy?: string, updatedBy?: string) {
        super(id);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    isCreatedAfter(date: Date): boolean {
        return this.createdAt > date;
    }

    isUpdatedAfter(date: Date): boolean {
        return this.updatedAt > date;
    }

    isUpdatedBy(userId: string): boolean {
        return this.updatedBy === userId;
    }
}

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

    isDeleted(): boolean {
        return this.deletedAt !== undefined && this.deletedAt !== null;
    }

    isDeletedBy(userId: string): boolean {
        return this.deletedBy === userId;
    }

    daysSinceDeletion(): number | null {
        if (!this.deletedAt) return null;
        return Math.floor((Date.now() - this.deletedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
}
