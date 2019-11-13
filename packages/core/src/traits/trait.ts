export const DEFAULT_FILTER = /(prototype|name|constructor|length)/;

export abstract class Trait {}

export function UseTraits(...traits: Trait[]) {
    return (target) => traits.forEach((trait) => copyProperties(target.prototype, (trait as any).prototype));
}

export function copyProperties<T1, T2>(target: T1, source: T2, filters = [DEFAULT_FILTER]) {
    Object.getOwnPropertyNames(source)
        .filter((key) => filters.every((f) => !f.test(key)) && typeof target[key] === 'undefined')
        .forEach((key) => {
            const desc = Object.getOwnPropertyDescriptor(source, key);
            Object.defineProperty(target, key, desc!);
        });
}
