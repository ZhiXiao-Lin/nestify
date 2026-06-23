export abstract class Entity<T = string> {
    protected readonly _id: T;

    constructor(id: T) {
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
        if (!(entity instanceof Entity)) {
            return false;
        }
        return this._id === entity._id;
    }

    equalsById(id: T): boolean {
        return this._id === id;
    }

    toString(): string {
        return `${this.constructor.name}:${String(this._id)}`;
    }

    toObject(): { id: T } {
        return { id: this._id };
    }
}
