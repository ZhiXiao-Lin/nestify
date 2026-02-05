export class Result<T> {
    public isSuccess: boolean;
    public isFailure: boolean;
    public error: string | null;
    private _value: T | null;

    private constructor(isSuccess: boolean, error?: string, value?: T) {
        if (isSuccess && error) {
            throw new Error('InvalidOperation: A result cannot be successful and contain an error');
        }
        if (!isSuccess && !error) {
            throw new Error('InvalidOperation: A failing result needs to contain an error message');
        }

        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error || null;
        this._value = value || null;

        Object.freeze(this);
    }

    public getValue(): T {
        if (!this.isSuccess) {
            throw new Error("Can't get the value of an error result. Use 'errorValue' instead.");
        }

        return this._value as T;
    }

    public static ok<U>(value?: U): Result<U> {
        return new Result<U>(true, undefined, value);
    }

    public static fail<U>(error: string): Result<U> {
        return new Result<U>(false, error);
    }

    public static combine(results: Result<any>[]): Result<any> {
        for (const result of results) {
            if (result.isFailure) return result;
        }
        return Result.ok();
    }
}
