import { DomainValidationError, ValueObject } from '../index';

interface ProfileProps {
    amount: number;
    createdAt: Date;
    metadata: {
        enabled: boolean;
        labels: string[];
        optional?: string;
    };
}

class ProfileValue extends ValueObject<ProfileProps> {}
class OtherProfileValue extends ValueObject<ProfileProps> {}

describe('ValueObject snapshots and equality', () => {
    it('takes a deep snapshot and returns defensive copies', () => {
        const input: ProfileProps = {
            amount: 10,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            metadata: { enabled: true, labels: ['one'] },
        };
        const value = new ProfileValue(input);

        input.amount = 20;
        input.createdAt.setUTCFullYear(2030);
        input.metadata.enabled = false;
        input.metadata.labels.push('two');

        const first = value.toObject();
        expect(first).toEqual({
            amount: 10,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            metadata: { enabled: true, labels: ['one'] },
        });
        expect(Object.isFrozen(first)).toBe(true);
        expect(Object.isFrozen(first.metadata)).toBe(true);
        expect(Object.isFrozen(first.metadata.labels)).toBe(true);

        first.createdAt.setUTCFullYear(2040);
        expect(value.toObject().createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
        expect(value.toObject()).not.toBe(first);
    });

    it('compares structurally without depending on object key order', () => {
        const left = new ProfileValue({
            amount: Number.NaN,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            metadata: { enabled: true, labels: ['one'], optional: undefined },
        });
        const right = new ProfileValue({
            metadata: { labels: ['one'], optional: undefined, enabled: true },
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            amount: Number.NaN,
        });

        expect(left.equals(left)).toBe(true);
        expect(left.equals(right)).toBe(true);
        expect(left.equals(new OtherProfileValue(right.toObject()))).toBe(false);
        expect(left.equals(undefined)).toBe(false);
    });

    it('distinguishes arrays, dates, missing keys, and primitive values', () => {
        const base = {
            amount: 1,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            metadata: { enabled: true, labels: ['one'] },
        };

        expect(new ProfileValue(base).equals(new ProfileValue({ ...base, amount: 2 }))).toBe(false);
        expect(
            new ProfileValue(base).equals(
                new ProfileValue({ ...base, createdAt: new Date('2026-01-02T00:00:00.000Z') }),
            ),
        ).toBe(false);
        expect(
            new ProfileValue(base).equals(
                new ProfileValue({ ...base, metadata: { ...base.metadata, labels: ['two'] } }),
            ),
        ).toBe(false);
        expect(
            new ProfileValue(base).equals(
                new ProfileValue({ ...base, metadata: { ...base.metadata, optional: undefined } }),
            ),
        ).toBe(false);
    });

    it('preserves safe own __proto__ and symbol keys without prototype mutation', () => {
        const symbolKey = Symbol('code');
        const props = Object.create(null) as Record<PropertyKey, unknown>;
        Object.defineProperty(props, '__proto__', { enumerable: true, value: 'safe' });
        props[symbolKey] = 'symbol-value';
        const Value = class extends ValueObject<Record<PropertyKey, unknown>> {};

        const object = new Value(props).toObject();

        expect(Object.hasOwn(object, '__proto__')).toBe(true);
        expect(object.__proto__).toBe('safe');
        expect(object[symbolKey]).toBe('symbol-value');
        expect(({} as { safe?: string }).safe).toBeUndefined();
    });

    it('rejects circular, unsupported, unreadable, and invalid-date values', () => {
        const Value = class extends ValueObject<Record<string, unknown>> {};
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        const unreadable = {};
        Object.defineProperty(unreadable, 'secret', {
            enumerable: true,
            get: () => {
                throw new Error('getter failed');
            },
        });

        expect(() => new Value(circular)).toThrow('Circular domain values');
        expect(() => new Value({ map: new Map() })).toThrow('only primitives, dates, arrays, and plain objects');
        expect(() => new Value({ callback: () => undefined })).toThrow('symbols or functions');
        expect(() => new Value({ date: new Date('invalid') })).toThrow('invalid dates');
        expect(() => new Value(unreadable)).toThrow('could not be read');
        expect(() => new Value(null as never)).toThrow(DomainValidationError);

        const unenumerable = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error('cannot enumerate');
                },
            },
        );
        const dateProxy = new Proxy(new Date(), {});
        expect(() => new Value(unenumerable)).toThrow('could not be enumerated');
        expect(() => new Value({ date: dateProxy })).toThrow('date could not be read');
    });

    it('enforces finite depth and entry budgets', () => {
        const Value = class extends ValueObject<Record<string, unknown>> {};
        let deep: Record<string, unknown> = { value: true };
        for (let index = 0; index < 65; index += 1) deep = { nested: deep };

        expect(() => new Value(deep)).toThrow('depth limit');
        expect(() => new Value({ values: Array.from({ length: 10_001 }, (_, index) => index) })).toThrow('entry limit');
    });
});
