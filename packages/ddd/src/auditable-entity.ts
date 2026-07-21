import { assertDateNotBefore, cloneValidDate, defineImmutableDateProperty } from './date-value';
import { Entity } from './entity';
import { DomainValidationError } from './errors';

export interface IAuditableEntity {
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly createdBy?: string;
    readonly updatedBy?: string;
}

export interface ISoftDeletable {
    readonly deletedAt?: Date;
    readonly deletedBy?: string;
}

export abstract class AuditableEntity<T = string> extends Entity<T> {
    public declare readonly createdAt: Date;
    public declare readonly updatedAt: Date;
    public readonly createdBy?: string;
    public readonly updatedBy?: string;

    constructor(id: T, createdAt: Date, updatedAt: Date, createdBy?: string, updatedBy?: string) {
        super(id);
        const createdAtValue = cloneValidDate(createdAt, 'createdAt');
        const updatedAtValue = cloneValidDate(updatedAt, 'updatedAt');
        assertDateNotBefore(updatedAtValue, createdAtValue, 'updatedAt', 'createdAt');
        defineImmutableDateProperty(this, 'createdAt', createdAtValue);
        defineImmutableDateProperty(this, 'updatedAt', updatedAtValue);
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    isCreatedAfter(date: Date): boolean {
        return this.createdAt.getTime() > cloneValidDate(date, 'date').getTime();
    }

    isUpdatedAfter(date: Date): boolean {
        return this.updatedAt.getTime() > cloneValidDate(date, 'date').getTime();
    }

    isUpdatedBy(actorId: string): boolean {
        return this.updatedBy === actorId;
    }
}

export abstract class SoftDeletableEntity<T = string> extends AuditableEntity<T> {
    public declare readonly deletedAt?: Date;
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
        const deletedAtValue = deletedAt ? cloneValidDate(deletedAt, 'deletedAt') : undefined;
        if (deletedAtValue) {
            assertDateNotBefore(deletedAtValue, this.updatedAt, 'deletedAt', 'updatedAt');
        }
        if (deletedBy !== undefined && !deletedAtValue) {
            throw new DomainValidationError('deletedBy requires deletedAt.', { field: 'deletedBy' });
        }
        defineImmutableDateProperty(this, 'deletedAt', deletedAtValue);
        this.deletedBy = deletedBy;
    }

    isDeleted(): boolean {
        return this.deletedAt !== undefined && this.deletedAt !== null;
    }

    isDeletedBy(actorId: string): boolean {
        return this.deletedBy === actorId;
    }

    daysSinceDeletion(asOf = new Date()): number | null {
        if (!this.deletedAt) return null;
        const reference = cloneValidDate(asOf, 'asOf');
        const deletedAt = this.deletedAt;
        assertDateNotBefore(reference, deletedAt, 'asOf', 'deletedAt');
        return Math.floor((reference.getTime() - deletedAt.getTime()) / 86_400_000);
    }
}
