export abstract class Entity<T> {
    protected readonly _id: T;

    constructor(id: T) {
        this._id = id;
    }

    get id(): T {
        return this._id;
    }

    public equals(object?: Entity<T>): boolean {
        if (object === null || object === undefined) {
            return false;
        }

        if (this === object) {
            return true;
        }

        if (!(object instanceof Entity)) {
            return false;
        }

        return this._id === object._id;
    }
}
