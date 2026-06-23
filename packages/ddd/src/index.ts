export interface IDomainEvent {
    occurredOn: Date;
    getAggregateId(): string;
}

export abstract class DomainEvent implements IDomainEvent {
    public readonly occurredOn: Date;

    constructor() {
        this.occurredOn = new Date();
    }

    abstract getAggregateId(): string;
}

export interface IDomainEventPublisher {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');

export abstract class Entity<T = string> {
    protected readonly _id: T;

    constructor(id: T) {
        this._id = id;
    }

    get id(): T {
        return this._id;
    }

    equals(entity?: Entity<T>): boolean {
        if (entity === null || entity === undefined) {
            return false;
        }
        if (this === entity) {
            return true;
        }
        if (!(entity instanceof Entity)) {
            return false;
        }
        return this._id === entity._id;
    }

    equalsById(id: T): boolean {
        return this._id === id;
    }

    toString(): string {
        return `${this.constructor.name}:${String(this._id)}`;
    }

    toObject(): { id: T } {
        return { id: this._id };
    }
}

export abstract class AggregateRoot<T = string> extends Entity<T> {
    private _domainEvents: DomainEvent[] = [];

    get domainEvents(): DomainEvent[] {
        return this._domainEvents;
    }

    addDomainEvent(domainEvent: DomainEvent): void {
        this._domainEvents.push(domainEvent);
    }

    clearEvents(): void {
        this._domainEvents = [];
    }
}

export type ValueObjectProps = object;

export abstract class ValueObject<T extends ValueObjectProps> {
    protected readonly props: T;

    constructor(props: T) {
        this.props = Object.freeze({ ...props }) as T;
    }

    equals(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }
        return JSON.stringify(this.props) === JSON.stringify(vo.props);
    }

    toObject(): T {
        return this.props;
    }
}

export interface IRepository<TId, TEntity> {
    findById(id: TId): Promise<TEntity | null>;
    save(entity: TEntity): Promise<TEntity>;
    delete(id: TId): Promise<void>;
}

export class DomainValidationError extends Error {
    public readonly details?: Record<string, unknown>;

    constructor(message: string, details?: Record<string, unknown>) {
        super(message);
        this.name = 'DomainValidationError';
        this.details = details;
    }
}

export interface IAuditableEntity {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

export interface ISoftDeletable {
    deletedAt?: Date;
    deletedBy?: string;
}

export abstract class AuditableEntity<T = string> extends Entity<T> {
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly createdBy?: string;
    public readonly updatedBy?: string;

    constructor(id: T, createdAt: Date, updatedAt: Date, createdBy?: string, updatedBy?: string) {
        super(id);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
    }

    isCreatedAfter(date: Date): boolean {
        return this.createdAt > date;
    }

    isUpdatedAfter(date: Date): boolean {
        return this.updatedAt > date;
    }

    isUpdatedBy(userId: string): boolean {
        return this.updatedBy === userId;
    }
}

export abstract class SoftDeletableEntity<T = string> extends AuditableEntity<T> {
    public readonly deletedAt?: Date;
    public readonly deletedBy?: string;

    constructor(
        id: T,
        createdAt: Date,
        updatedAt: Date,
        deletedAt?: Date,
        deletedBy?: string,
        createdBy?: string,
        updatedBy?: string,
    ) {
        super(id, createdAt, updatedAt, createdBy, updatedBy);
        this.deletedAt = deletedAt;
        this.deletedBy = deletedBy;
    }

    isDeleted(): boolean {
        return this.deletedAt !== undefined && this.deletedAt !== null;
    }

    isDeletedBy(userId: string): boolean {
        return this.deletedBy === userId;
    }

    daysSinceDeletion(): number | null {
        if (!this.deletedAt) return null;
        return Math.floor((Date.now() - this.deletedAt.getTime()) / (1000 * 60 * 60 * 24));
    }
}

export interface IUseCase<IRequest, IResponse> {
    execute(request: IRequest): Promise<IResponse>;
}

export interface IQuery<IResponse> {
    execute(): Promise<IResponse>;
}

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

    map<U>(fn: (value: T) => U): Result<U> {
        return this.isSuccess ? Result.ok(fn(this._value as T)) : Result.fail(this.error ?? 'Unknown error');
    }

    async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U>> {
        return this.isSuccess ? Result.ok(await fn(this._value as T)) : Result.fail(this.error ?? 'Unknown error');
    }

    flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
        return this.isSuccess ? fn(this._value as T) : Result.fail(this.error ?? 'Unknown error');
    }

    async flatMapAsync<U>(fn: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
        return this.isSuccess ? await fn(this._value as T) : Result.fail(this.error ?? 'Unknown error');
    }

    fold<U>(onSuccess: (value: T) => U, onFailure: (error: string) => U): U {
        return this.isSuccess ? onSuccess(this._value as T) : onFailure(this.error ?? 'Unknown error');
    }

    static ok<U>(value?: U): Result<U> {
        return new Result<U>(true, null, value ?? null);
    }

    static fail<U>(error: string): Result<U> {
        return new Result<U>(false, error, null);
    }

    static fromTry<U>(fn: () => U): Result<U> {
        try {
            return Result.ok(fn());
        } catch (error) {
            return Result.fail(error instanceof Error ? error.message : String(error));
        }
    }

    static async fromTryAsync<U>(fn: () => Promise<U>): Promise<Result<U>> {
        try {
            return Result.ok(await fn());
        } catch (error) {
            return Result.fail(error instanceof Error ? error.message : String(error));
        }
    }

    static combine<T extends Result<unknown>[]>(...results: T): Result<{ [K in keyof T]: UnwrapResult<T[K]> }> {
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
}

export type UnwrapResult<T> = T extends Result<infer U> ? U : T;
export type VoidResult = Result<null>;
export const voidOk = (): VoidResult => Result.ok(null);

export interface GuardArgument {
    argument: unknown;
    argumentName: string;
}

export interface GuardResult {
    succeeded: boolean;
    message?: string;
}

export class Guard {
    static againstNullOrUndefined(argument: unknown, argumentName: string): GuardResult {
        if (argument === null || argument === undefined) {
            return { succeeded: false, message: `${argumentName} is null or undefined` };
        }
        return { succeeded: true };
    }

    static againstNullOrUndefinedBulk(args: GuardArgument[]): GuardResult {
        for (const arg of args) {
            const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
            if (!result.succeeded) return result;
        }
        return { succeeded: true };
    }

    static isOneOf<T>(value: T, validValues: readonly T[], argumentName: string): GuardResult {
        if (validValues.includes(value)) {
            return { succeeded: true };
        }
        return {
            succeeded: false,
            message: `${argumentName} is not one of ${JSON.stringify(validValues)}. Got ${JSON.stringify(value)}.`,
        };
    }

    static inRange(num: number, min: number, max: number, argumentName: string): GuardResult {
        if (num < min || num > max) {
            return { succeeded: false, message: `${argumentName} is not within range ${min} to ${max}.` };
        }
        return { succeeded: true };
    }

    static allInRange(numbers: number[], min: number, max: number, argumentName: string): GuardResult {
        for (const num of numbers) {
            const result = this.inRange(num, min, max, argumentName);
            if (!result.succeeded) {
                return { succeeded: false, message: `${argumentName} is not within the range.` };
            }
        }
        return { succeeded: true };
    }
}
