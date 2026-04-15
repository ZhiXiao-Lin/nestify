// ============================================================================
// Result Type - Functional error handling without exceptions
// ============================================================================

/**
 * A result type that represents either a success value or a failure with error.
 * Inspired by Rust's Result type and fp-ts Either.
 */
export class Result<T> {
    public readonly isSuccess: boolean;
    public readonly isFailure: boolean;
    public readonly error: string | null;
    private readonly _value: T | null;

    private constructor(isSuccess: boolean, error: string | null, value: T | null) {
        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error;
        this._value = value;

        Object.freeze(this);
    }

    /**
     * Get the value or throw if error
     */
    getValue(): T {
        if (this.isFailure) {
            throw new Error(`Result is in failure state: ${this.error}`);
        }
        return this._value as T;
    }

    /**
     * Get the value or a default if error
     */
    getValueOrElse(defaultValue: T): T {
        return this.isSuccess ? (this._value as T) : defaultValue;
    }

    /**
     * Get the value or undefined
     */
    getValueOrUndefined(): T | undefined {
        return this.isSuccess ? (this._value as T) : undefined;
    }

    /**
     * Map success value to a new Result
     */
    map<U>(fn: (value: T) => U): Result<U> {
        if (this.isSuccess) {
            return Result.ok(fn(this._value as T));
        }
        return Result.fail(this.error!);
    }

    /**
     * Map success value to a new Result (async)
     */
    async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U>> {
        if (this.isSuccess) {
            return Result.ok(await fn(this._value as T));
        }
        return Result.fail(this.error!);
    }

    /**
     * FlatMap - chain operations that return Results
     */
    flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
        if (this.isSuccess) {
            return fn(this._value as T);
        }
        return Result.fail(this.error!);
    }

    /**
     * FlatMap - chain async operations that return Results
     */
    async flatMapAsync<U>(fn: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
        if (this.isSuccess) {
            return await fn(this._value as T);
        }
        return Result.fail(this.error!);
    }

    /**
     * Fold - handle both success and failure cases
     */
    fold<U>(onSuccess: (value: T) => U, onFailure: (error: string) => U): U {
        if (this.isSuccess) {
            return onSuccess(this._value as T);
        }
        return onFailure(this.error!);
    }

    /**
     * Fold async - handle both success and failure cases (async)
     */
    async foldAsync<U>(
        onSuccess: (value: T) => Promise<U>,
        onFailure: (error: string) => Promise<U>,
    ): Promise<U> {
        if (this.isSuccess) {
            return await onSuccess(this._value as T);
        }
        return await onFailure(this.error!);
    }

    /**
     * Tap - execute side effects without changing the result
     */
    tap(fn: (value: T) => void): Result<T> {
        if (this.isSuccess) {
            fn(this._value as T);
        }
        return this;
    }

    /**
     * Tap async - execute async side effects without changing the result
     */
    async tapAsync(fn: (value: T) => Promise<void>): Promise<Result<T>> {
        if (this.isSuccess) {
            await fn(this._value as T);
        }
        return this;
    }

    /**
     * Check if result contains a specific value
     */
    contains(value: T): boolean {
        return this.isSuccess && this._value === value;
    }

    /**
     * Check if result's error matches a predicate
     */
    existsError(predicate: (error: string) => boolean): boolean {
        return this.isFailure && predicate(this.error!);
    }

    // =========================================================================
    // Static Constructors
    // =========================================================================

    static ok<U>(value?: U): Result<U> {
        return new Result<U>(true, null, value ?? null);
    }

    static fail<U>(error: string): Result<U> {
        return new Result<U>(false, error, null);
    }

    /**
     * Create Result from a try/catch
     */
    static fromTry<U>(fn: () => U): Result<U> {
        try {
            return Result.ok(fn());
        } catch (error) {
            return Result.fail(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Create Result from an async try/catch
     */
    static async fromTryAsync<U>(fn: () => Promise<U>): Promise<Result<U>> {
        try {
            return Result.ok(await fn());
        } catch (error) {
            return Result.fail(error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Combine multiple Results - fail fast on first failure
     */
    static combine<T extends Result<any>[]>(...results: T): Result<{ [K in keyof T]: UnwrapResult<T[K]> }> {
        const failures: string[] = [];

        for (const result of results) {
            if (result.isFailure) {
                failures.push(result.error!);
            }
        }

        if (failures.length > 0) {
            return Result.fail(failures.join('; ')) as any;
        }

        return Result.ok(results.map(r => r.getValue())) as any;
    }

    /**
     * Combine multiple Results - collect all failures
     */
    static combineAll<T>(...results: Array<Result<T>>): Result<T[]> {
        const failures: string[] = [];
        const values: T[] = [];

        for (const result of results) {
            if (result.isFailure) {
                failures.push(result.error!);
            } else {
                values.push(result.getValue());
            }
        }

        if (failures.length > 0) {
            return Result.fail(`Multiple failures (${failures.length}): ${failures.join('; ')}`);
        }

        return Result.ok(values);
    }
}

/**
 * Type helper to unwrap Result<T>
 */
export type UnwrapResult<T> = T extends Result<infer U> ? U : T;

/**
 * Shorthand for Result<null>
 */
export type VoidResult = Result<null>;

/**
 * Create a successful void result
 */
export const voidOk = (): VoidResult => Result.ok(null);
