import { DomainValidationError } from './errors';

export abstract class Entity<T = string> {
    protected readonly _id: T;

    constructor(id: T) {
        if (id === null || id === undefined || (typeof id === 'string' && id.trim().length === 0)) {
            throw new DomainValidationError('Entity id must be defined and non-empty.', { field: 'id' });
        }
        if (typeof id === 'number' && !Number.isFinite(id)) {
            throw new DomainValidationError('Entity id must be a finite number.', { field: 'id' });
        }
        this._id = id;
    }

    get id(): T {
        return this._id;
    }

    equals(entity?: Entity<T>): boolean {
        if (entity === null || entity === undefined) {
            return false;
        }
        if (this === entity) {
            return true;
        }
        if (!(entity instanceof Entity) || this.constructor !== entity.constructor) {
            return false;
        }
        return Object.is(this._id, entity._id);
    }

    equalsById(id: T): boolean {
        return Object.is(this._id, id);
    }

    toString(): string {
        return `${this.constructor.name}:${String(this._id)}`;
    }

    toObject(): { id: T } {
        return { id: this._id };
    }
}
