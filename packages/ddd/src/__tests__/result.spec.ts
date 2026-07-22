import { RESULT_ERROR_MAX_LENGTH, Result, voidOk } from '../index';

describe('Result success and failure invariants', () => {
    it('preserves explicit undefined without converting it to null', () => {
        const result = Result.ok(undefined);

        expect(result.isSuccess).toBe(true);
        expect(result.isFailure).toBe(false);
        expect(result.error).toBeNull();
        expect(result.getValue()).toBeUndefined();
        expect(result.getValueOrNull()).toBeUndefined();
        expect(Result.ok().getValue()).toBeUndefined();
        expect(voidOk().getValue()).toBeNull();
        expect(Object.isFrozen(result)).toBe(true);
    });

    it('provides explicit success and failure fallback accessors', () => {
        expect(Result.ok(2).getValueOrElse(3)).toBe(2);
        expect(Result.ok(2).getValueOrUndefined()).toBe(2);
        expect(Result.ok(2).getValueOrNull()).toBe(2);

        const failure = Result.fail<number>('failed');
        expect(failure.getValueOrElse(3)).toBe(3);
        expect(failure.getValueOrUndefined()).toBeUndefined();
        expect(failure.getValueOrNull()).toBeNull();
        expect(() => failure.getValue()).toThrow('Result is in failure state: failed');
    });

    it('maps and flat-maps successful synchronous values', () => {
        const mapped = Result.ok(2)
            .map(value => value * 3)
            .flatMap(value => Result.ok(String(value)));

        expect(mapped.getValue()).toBe('6');
        expect(
            mapped.fold(
                value => `ok:${value}`,
                error => `error:${error}`,
            ),
        ).toBe('ok:6');
    });

    it('short-circuits failed synchronous transformations', () => {
        const mapper = jest.fn((value: number) => value * 2);
        const flatMapper = jest.fn((value: number) => Result.ok(value * 2));
        const failure = Result.fail<number>('failed');

        expect(failure.map(mapper)).toMatchObject({ isFailure: true, error: 'failed' });
        expect(failure.flatMap(flatMapper)).toMatchObject({ isFailure: true, error: 'failed' });
        expect(
            failure.fold(
                value => `ok:${value}`,
                error => `error:${error}`,
            ),
        ).toBe('error:failed');
        expect(mapper).not.toHaveBeenCalled();
        expect(flatMapper).not.toHaveBeenCalled();
    });

    it('maps and flat-maps asynchronous values', async () => {
        await expect(Result.ok(2).mapAsync(async value => value * 2)).resolves.toMatchObject({
            isSuccess: true,
        });
        await expect(Result.ok(2).flatMapAsync(async value => Result.ok(value * 3))).resolves.toMatchObject({
            isSuccess: true,
        });
        await expect(Result.fail<number>('failed').mapAsync(async value => value * 2)).resolves.toMatchObject({
            isFailure: true,
            error: 'failed',
        });
        await expect(
            Result.fail<number>('failed').flatMapAsync(async value => Result.ok(value * 2)),
        ).resolves.toMatchObject({ isFailure: true, error: 'failed' });
    });

    it('runs only the tap matching the current state', () => {
        const successTap = jest.fn();
        const errorTap = jest.fn();
        const success = Result.ok(2);
        const failure = Result.fail<number>('failed');

        expect(success.tap(successTap).tapError(errorTap)).toBe(success);
        expect(failure.tap(successTap).tapError(errorTap)).toBe(failure);
        expect(successTap).toHaveBeenCalledTimes(1);
        expect(successTap).toHaveBeenCalledWith(2);
        expect(errorTap).toHaveBeenCalledTimes(1);
        expect(errorTap).toHaveBeenCalledWith('failed');
    });
});

describe('Result error capture and aggregation', () => {
    it('normalizes unknown, empty, throwing, and oversized failures', () => {
        const unprintable = {
            toString() {
                throw new Error('cannot stringify');
            },
        };

        expect(Result.fail(new Error('boom')).error).toBe('boom');
        expect(Result.fail('   ').error).toBe('Unknown error');
        expect(Result.fail(null).error).toBe('Unknown error');
        expect(Result.fail(unprintable).error).toBe('Unknown error');
        const bounded = Result.fail('x'.repeat(RESULT_ERROR_MAX_LENGTH + 100)).error as string;
        expect(bounded).toHaveLength(RESULT_ERROR_MAX_LENGTH);
        expect(bounded.endsWith('…')).toBe(true);
    });

    it('captures synchronous thrown values', () => {
        expect(Result.fromTry(() => 2).getValue()).toBe(2);
        expect(
            Result.fromTry(() => {
                throw new Error('sync failure');
            }),
        ).toMatchObject({ isFailure: true, error: 'sync failure' });
        expect(
            Result.fromTry(() => {
                throw 'string failure';
            }),
        ).toMatchObject({ isFailure: true, error: 'string failure' });
    });

    it('captures asynchronous rejected values', async () => {
        await expect(Result.fromTryAsync(async () => 2)).resolves.toMatchObject({ isSuccess: true });
        await expect(
            Result.fromTryAsync(async () => {
                throw new Error('async failure');
            }),
        ).resolves.toMatchObject({ isFailure: true, error: 'async failure' });
    });

    it('combines heterogeneous tuples and reports all failures', () => {
        expect(Result.combine(Result.ok(1), Result.ok('two')).getValue()).toEqual([1, 'two']);
        expect(Result.combine(Result.fail('first'), Result.ok(2), Result.fail('second'))).toMatchObject({
            isFailure: true,
            error: 'first; second',
        });
        expect(Result.combine().getValue()).toEqual([]);
    });

    it('combines homogeneous values without returning partial data', () => {
        expect(Result.combineAll(Result.ok(1), Result.ok(2)).getValue()).toEqual([1, 2]);
        expect(
            Result.combineAll(Result.ok(1), Result.fail<number>('first'), Result.fail<number>('second')),
        ).toMatchObject({
            isFailure: true,
            error: 'Multiple failures (2): first; second',
        });
        expect(Result.combineAll<number>().getValue()).toEqual([]);
    });

    it('finds the first failure and preserves tuple order in all()', () => {
        const first = Result.fail('first');
        const second = Result.fail('second');

        expect(Result.firstFailure([Result.ok(1), first, second])).toBe(first);
        expect(Result.firstFailure([Result.ok(1)])).toBeUndefined();
        expect(Result.all([Result.ok(1), Result.ok('two')] as const).getValue()).toEqual([1, 'two']);
        expect(Result.all([Result.ok(1), first] as const)).toMatchObject({ isFailure: true, error: 'first' });
        expect(Result.all([] as const).getValue()).toEqual([]);
    });
});
