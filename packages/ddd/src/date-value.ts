import { DomainValidationError } from './errors';

export function cloneValidDate(value: Date, name: string): Date {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new DomainValidationError(`${name} must be a valid Date.`, { field: name });
    }
    return new Date(value.getTime());
}

export function assertDateNotBefore(value: Date, minimum: Date, name: string, minimumName: string): void {
    if (value.getTime() < minimum.getTime()) {
        throw new DomainValidationError(`${name} must not be before ${minimumName}.`, {
            field: name,
            minimumField: minimumName,
        });
    }
}

export function defineImmutableDateProperty(target: object, name: string, value: Date | undefined): void {
    Object.defineProperty(target, name, {
        configurable: false,
        enumerable: true,
        get: () => (value ? new Date(value.getTime()) : undefined),
    });
}
