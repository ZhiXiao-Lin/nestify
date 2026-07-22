import { DomainValidationError } from './errors';

export const DOMAIN_VALUE_MAX_DEPTH = 64;
export const DOMAIN_VALUE_MAX_ENTRIES = 10_000;

interface SnapshotState {
    active: WeakSet<object>;
    entries: number;
}

export function snapshotDomainValue<T>(value: T): T {
    return snapshotValue(value, '$', 0, { active: new WeakSet<object>(), entries: 0 }) as T;
}

export function domainValuesEqual(left: unknown, right: unknown): boolean {
    if (
        left === right ||
        (typeof left === 'number' && typeof right === 'number' && Number.isNaN(left) && Number.isNaN(right))
    ) {
        return true;
    }
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
        return false;
    }
    if (left instanceof Date || right instanceof Date) {
        return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        return left.every((item, index) => domainValuesEqual(item, right[index]));
    }
    if (!isPlainObject(left) || !isPlainObject(right)) return false;

    const leftKeys = enumerableOwnKeys(left);
    const rightKeys = enumerableOwnKeys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(
        key =>
            Object.prototype.propertyIsEnumerable.call(right, key) &&
            domainValuesEqual(Reflect.get(left, key), Reflect.get(right, key)),
    );
}

export function describeDomainValue(value: unknown, maxLength = 512): string {
    let description: string;
    try {
        const seen = new WeakSet<object>();
        const serialized = JSON.stringify(value, (_key, item: unknown) => {
            if (typeof item === 'bigint') return `${item}n`;
            if (typeof item === 'symbol' || typeof item === 'function') return String(item);
            if (item && typeof item === 'object') {
                if (seen.has(item)) return '[Circular]';
                seen.add(item);
            }
            return item;
        });
        description = serialized ?? String(value);
    } catch {
        try {
            description = Object.prototype.toString.call(value);
        } catch {
            description = '[Unprintable value]';
        }
    }
    return description.length <= maxLength ? description : `${description.slice(0, maxLength - 1)}…`;
}

function snapshotValue(value: unknown, path: string, depth: number, state: SnapshotState): unknown {
    state.entries += 1;
    if (state.entries > DOMAIN_VALUE_MAX_ENTRIES) {
        throw invalidDomainValue('Domain value entry limit exceeded.', path);
    }
    if (depth > DOMAIN_VALUE_MAX_DEPTH) {
        throw invalidDomainValue('Domain value depth limit exceeded.', path);
    }
    if (value === null || value === undefined) return value;

    const valueType = typeof value;
    if (valueType === 'string' || valueType === 'boolean' || valueType === 'bigint') return value;
    if (valueType === 'number') return value;
    if (valueType === 'symbol' || valueType === 'function') {
        throw invalidDomainValue('Domain values cannot contain symbols or functions.', path);
    }
    if (value instanceof Date) {
        let timestamp: number;
        try {
            timestamp = value.getTime();
        } catch {
            throw invalidDomainValue('Domain value date could not be read.', path);
        }
        if (Number.isNaN(timestamp)) throw invalidDomainValue('Domain values cannot contain invalid dates.', path);
        return new Date(timestamp);
    }
    if (Array.isArray(value)) {
        enterContainer(value, path, state);
        try {
            try {
                return Object.freeze(
                    value.map((item, index) => snapshotValue(item, `${path}[${index}]`, depth + 1, state)),
                );
            } catch (error) {
                if (error instanceof DomainValidationError) throw error;
                throw invalidDomainValue('Domain value array could not be read.', path);
            }
        } finally {
            state.active.delete(value);
        }
    }
    if (!isPlainObject(value)) {
        throw invalidDomainValue('Domain values can contain only primitives, dates, arrays, and plain objects.', path);
    }

    enterContainer(value, path, state);
    try {
        const snapshot: Record<PropertyKey, unknown> = {};
        let keys: Array<string | symbol>;
        try {
            keys = enumerableOwnKeys(value);
        } catch {
            throw invalidDomainValue('Domain value properties could not be enumerated.', path);
        }
        for (const key of keys) {
            const childPath = appendDomainPath(path, key);
            let child: unknown;
            try {
                child = Reflect.get(value, key);
            } catch {
                throw invalidDomainValue('Domain value property could not be read.', childPath);
            }
            Object.defineProperty(snapshot, key, {
                configurable: false,
                enumerable: true,
                value: snapshotValue(child, childPath, depth + 1, state),
                writable: false,
            });
        }
        return Object.freeze(snapshot);
    } finally {
        state.active.delete(value);
    }
}

function enterContainer(value: object, path: string, state: SnapshotState): void {
    if (state.active.has(value)) {
        throw invalidDomainValue('Circular domain values are not supported.', path);
    }
    state.active.add(value);
}

function enumerableOwnKeys(value: object): Array<string | symbol> {
    return Reflect.ownKeys(value).filter(key => Object.prototype.propertyIsEnumerable.call(value, key));
}

function isPlainObject(value: object): value is Record<PropertyKey, unknown> {
    try {
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    } catch {
        return false;
    }
}

function invalidDomainValue(message: string, path: string): DomainValidationError {
    return new DomainValidationError(message, { path });
}

function appendDomainPath(parent: string, key: string | symbol): string {
    const segment = String(key);
    const path = `${parent}.${segment}`;
    return path.length <= 512 ? path : `${path.slice(0, 511)}…`;
}
