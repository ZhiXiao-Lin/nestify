export const RESULT_ERROR_MAX_LENGTH = 4_096;

export class Result<T> {
    public readonly isSuccess: boolean;
    public readonly isFailure: boolean;
    public readonly error: string | null;
    private readonly _value: T | undefined;

    private constructor(isSuccess: boolean, error: string | null, value: T | undefined) {
        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error;
        this._value = value;
        Object.freeze(this);
    }

    getValue(): T {
        if (this.isFailure) {
            throw new Error(`Result is in failure state: ${this.error}`);
        }
        return this._value as T;
    }

    getValueOrElse(defaultValue: T): T {
        return this.isSuccess ? (this._value as T) : defaultValue;
    }

    getValueOrUndefined(): T | undefined {
        return this.isSuccess ? (this._value as T) : undefined;
    }

    getValueOrNull(): T | null {
        return this.isSuccess ? (this._value as T) : null;
    }

    map<U>(mapper: (value: T) => U): Result<U> {
        if (this.isFailure) {
            return Result.fail<U>(this.error ?? 'Unknown error');
        }
        return Result.ok(mapper(this._value as T));
    }

    async mapAsync<U>(mapper: (value: T) => Promise<U>): Promise<Result<U>> {
        if (this.isFailure) {
            return Result.fail<U>(this.error ?? 'Unknown error');
        }
        return Result.ok(await mapper(this._value as T));
    }

    flatMap<U>(mapper: (value: T) => Result<U>): Result<U> {
        if (this.isFailure) {
            return Result.fail<U>(this.error ?? 'Unknown error');
        }
        return mapper(this._value as T);
    }

    async flatMapAsync<U>(mapper: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
        return this.isSuccess ? await mapper(this._value as T) : Result.fail(this.error ?? 'Unknown error');
    }

    fold<U>(onSuccess: (value: T) => U, onFailure: (error: string) => U): U {
        return this.isSuccess ? onSuccess(this._value as T) : onFailure(this.error ?? 'Unknown error');
    }

    tap(fn: (value: T) => void): Result<T> {
        if (this.isSuccess) {
            fn(this._value as T);
        }
        return this;
    }

    tapError(fn: (error: string) => void): Result<T> {
        if (this.isFailure) {
            fn(this.error ?? 'Unknown error');
        }
        return this;
    }

    static ok(): Result<void>;
    static ok<U>(value: U): Result<U>;
    static ok<U>(value?: U): Result<U | void> {
        return new Result<U | void>(true, null, value);
    }

    static fail<U = never>(error: unknown): Result<U> {
        return new Result<U>(false, normalizeResultError(error), undefined);
    }

    static fromTry<U>(fn: () => U): Result<U> {
        try {
            return Result.ok(fn());
        } catch (error) {
            return Result.fail(error);
        }
    }

    static async fromTryAsync<U>(fn: () => Promise<U>): Promise<Result<U>> {
        try {
            return Result.ok(await fn());
        } catch (error) {
            return Result.fail(error);
        }
    }

    static combine<T extends readonly Result<unknown>[]>(
        ...results: T
    ): Result<{ [K in keyof T]: UnwrapResult<T[K]> }> {
        const failures = results.filter(result => result.isFailure).map(result => result.error ?? 'Unknown error');
        if (failures.length > 0) {
            return Result.fail(failures.join('; ')) as Result<{ [K in keyof T]: UnwrapResult<T[K]> }>;
        }
        return Result.ok(results.map(result => result.getValue())) as Result<{ [K in keyof T]: UnwrapResult<T[K]> }>;
    }

    static combineAll<T>(...results: Array<Result<T>>): Result<T[]> {
        const failures: string[] = [];
        const values: T[] = [];

        for (const result of results) {
            if (result.isFailure) {
                failures.push(result.error ?? 'Unknown error');
            } else {
                values.push(result.getValue());
            }
        }

        if (failures.length > 0) {
            return Result.fail(`Multiple failures (${failures.length}): ${failures.join('; ')}`);
        }

        return Result.ok(values);
    }

    static firstFailure(results: readonly Result<unknown>[]): Result<unknown> | undefined {
        return results.find(result => result.isFailure);
    }

    static all<TValues extends readonly unknown[]>(
        results: { [K in keyof TValues]: Result<TValues[K]> },
    ): Result<TValues> {
        const failed = Result.firstFailure(results as readonly Result<unknown>[]);
        if (failed?.isFailure) {
            return Result.fail<TValues>(failed.error ?? 'Unknown error');
        }
        return Result.ok(results.map(result => result.getValue()) as unknown as TValues);
    }
}

function normalizeResultError(error: unknown): string {
    let message = '';
    try {
        if (typeof error === 'string') {
            message = error.trim();
        } else if (error instanceof Error) {
            message = error.message.trim() || error.name;
        } else if (error !== null && error !== undefined) {
            message = String(error).trim();
        }
    } catch {
        message = '';
    }
    if (!message) message = 'Unknown error';
    return message.length <= RESULT_ERROR_MAX_LENGTH ? message : `${message.slice(0, RESULT_ERROR_MAX_LENGTH - 1)}…`;
}

export type UnwrapResult<T> = T extends Result<infer U> ? U : T;
export type VoidResult = Result<null>;
export const voidOk = (): VoidResult => Result.ok(null);
