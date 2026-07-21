import { Guard } from '../index';

describe('Guard composition and presence checks', () => {
    it('returns the first failure or a stable success', () => {
        const first = { succeeded: false, message: 'first' } as const;
        const second = { succeeded: false, message: 'second' } as const;

        expect(Guard.combine([{ succeeded: true }, first, second])).toBe(first);
        expect(Guard.combine([])).toEqual({ succeeded: true });
    });

    it('checks null and undefined values in isolation and bulk', () => {
        expect(Guard.againstNullOrUndefined(null, 'value')).toEqual({
            succeeded: false,
            message: 'value is null or undefined',
        });
        expect(Guard.againstNullOrUndefined(0, 'value')).toEqual({ succeeded: true });
        expect(
            Guard.againstNullOrUndefinedBulk([
                { argument: 'one', argumentName: 'first' },
                { argument: undefined, argumentName: 'second' },
            ]),
        ).toEqual({ succeeded: false, message: 'second is null or undefined' });
    });

    it('rejects empty and non-string values without throwing', () => {
        expect(Guard.againstEmptyString(' value ', 'name')).toEqual({ succeeded: true });
        expect(Guard.againstEmptyString('   ', 'name')).toEqual({ succeeded: false, message: 'name is empty' });
        expect(Guard.againstEmptyString(null, 'name')).toEqual({
            succeeded: false,
            message: 'name must be a string',
        });
    });
});

describe('Guard membership formatting', () => {
    it('uses SameValueZero membership and formats ordinary failures', () => {
        expect(Guard.isOneOf(Number.NaN, [1, Number.NaN], 'number')).toEqual({ succeeded: true });
        expect(Guard.isOneOf('c', ['a', 'b'], 'letter').message).toBe('letter is not one of ["a","b"]. Got "c".');
    });

    it('formats circular and bigint values without throwing', () => {
        const circular: Record<string, unknown> = { id: 1n };
        circular.self = circular;

        expect(() => Guard.isOneOf(circular, [], 'value')).not.toThrow();
        expect(Guard.isOneOf(circular, [], 'value').message).toContain('[Circular]');
        expect(Guard.isOneOf(2n, [1n], 'value').message).toContain('2n');
    });

    it('falls back for values whose getters or tags throw and bounds messages', () => {
        const proxy = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error('cannot inspect');
                },
                getPrototypeOf: () => {
                    throw new Error('cannot inspect');
                },
            },
        );
        const long = 'x'.repeat(1_000);

        expect(() => Guard.isOneOf(proxy, [], 'proxy')).not.toThrow();
        expect((Guard.isOneOf(long, [], 'long').message as string).length).toBeLessThan(1_100);
    });
});

describe('Guard numeric and length ranges', () => {
    it('accepts inclusive finite ranges and rejects out-of-range values', () => {
        expect(Guard.inRange(1, 1, 2, 'count')).toEqual({ succeeded: true });
        expect(Guard.inRange(2, 1, 2, 'count')).toEqual({ succeeded: true });
        expect(Guard.inRange(3, 1, 2, 'count')).toEqual({
            succeeded: false,
            message: 'count must be between 1 and 2',
        });
        expect(Guard.inRange(Number.NaN, 1, 2, 'count')).toEqual({
            succeeded: false,
            message: 'count must be a finite number',
        });
    });

    it.each([
        [Number.NaN, 2],
        [1, Number.POSITIVE_INFINITY],
        [2, 1],
    ])('rejects invalid range bounds %p..%p', (min, max) => {
        expect(Guard.inRange(1, min, max, 'count')).toEqual({
            succeeded: false,
            message: 'count range bounds are invalid',
        });
    });

    it('checks every member of numeric arrays', () => {
        expect(Guard.allInRange([1, 2], 1, 2, 'counts')).toEqual({ succeeded: true });
        expect(Guard.allInRange([1, 3], 1, 2, 'counts')).toEqual({
            succeeded: false,
            message: 'counts is not within the range.',
        });
        expect(Guard.allInRange([1, Number.NaN], 1, 2, 'counts')).toEqual({
            succeeded: false,
            message: 'counts is not within the range.',
        });
        expect(Guard.allInRange(null as never, 1, 2, 'counts')).toEqual({
            succeeded: false,
            message: 'counts must be an array of finite numbers',
        });
        expect(Guard.allInRange([], 2, 1, 'counts').message).toBe('counts range bounds are invalid');
    });

    it('checks strict greater-than values and finite configuration', () => {
        expect(Guard.greaterThan(2, 1, 'count')).toEqual({ succeeded: true });
        expect(Guard.greaterThan(1, 1, 'count').message).toBe('count must be greater than 1');
        expect(Guard.greaterThan(Number.POSITIVE_INFINITY, 1, 'count').message).toBe(
            'count and its minimum must be finite numbers',
        );
    });

    it('checks safe string length bounds', () => {
        expect(Guard.againstInvalidLength('abc', 1, 3, 'name')).toEqual({ succeeded: true });
        expect(Guard.againstInvalidLength('', 1, 3, 'name').message).toBe('name length must be between 1 and 3');
        expect(Guard.againstInvalidLength(null, 1, 3, 'name').message).toBe('name must be a string');
        expect(Guard.againstInvalidLength('abc', -1, 3, 'name').message).toBe('name length bounds are invalid');
        expect(Guard.againstInvalidLength('abc', 4, 3, 'name').message).toBe('name length bounds are invalid');
    });
});
