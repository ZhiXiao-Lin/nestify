import { describeDomainValue } from './domain-value';

export interface GuardArgument {
    readonly argument: unknown;
    readonly argumentName: string;
}

export interface GuardResult {
    readonly succeeded: boolean;
    readonly message?: string;
}

export class Guard {
    static combine(results: readonly GuardResult[]): GuardResult {
        for (const result of results) {
            if (!result.succeeded) return result;
        }
        return { succeeded: true };
    }

    static againstNullOrUndefined(argument: unknown, argumentName: string): GuardResult {
        if (argument === null || argument === undefined) {
            return { succeeded: false, message: `${argumentName} is null or undefined` };
        }
        return { succeeded: true };
    }

    static againstNullOrUndefinedBulk(args: readonly GuardArgument[]): GuardResult {
        return Guard.combine(args.map(arg => Guard.againstNullOrUndefined(arg.argument, arg.argumentName)));
    }

    static isOneOf<T>(value: T, validValues: readonly T[], argumentName: string): GuardResult {
        if (validValues.includes(value)) {
            return { succeeded: true };
        }
        return {
            succeeded: false,
            message: `${argumentName} is not one of ${describeDomainValue(validValues)}. Got ${describeDomainValue(value)}.`,
        };
    }

    static againstEmptyString(argument: unknown, argumentName: string): GuardResult {
        if (typeof argument !== 'string') {
            return { succeeded: false, message: `${argumentName} must be a string` };
        }
        if (argument.trim().length === 0) {
            return { succeeded: false, message: `${argumentName} is empty` };
        }
        return { succeeded: true };
    }

    static inRange(value: number, min: number, max: number, argumentName: string): GuardResult {
        const boundsError = validateRangeBounds(min, max, argumentName);
        if (boundsError) return boundsError;
        if (!Number.isFinite(value)) {
            return { succeeded: false, message: `${argumentName} must be a finite number` };
        }
        if (value < min || value > max) {
            return { succeeded: false, message: `${argumentName} must be between ${min} and ${max}` };
        }
        return { succeeded: true };
    }

    static allInRange(numbers: readonly number[], min: number, max: number, argumentName: string): GuardResult {
        const boundsError = validateRangeBounds(min, max, argumentName);
        if (boundsError) return boundsError;
        if (!Array.isArray(numbers)) {
            return { succeeded: false, message: `${argumentName} must be an array of finite numbers` };
        }
        for (const num of numbers) {
            const result = this.inRange(num, min, max, argumentName);
            if (!result.succeeded) {
                return { succeeded: false, message: `${argumentName} is not within the range.` };
            }
        }
        return { succeeded: true };
    }

    static greaterThan(value: number, min: number, argumentName: string): GuardResult {
        if (!Number.isFinite(value) || !Number.isFinite(min)) {
            return { succeeded: false, message: `${argumentName} and its minimum must be finite numbers` };
        }
        if (value <= min) {
            return { succeeded: false, message: `${argumentName} must be greater than ${min}` };
        }
        return { succeeded: true };
    }

    static againstInvalidLength(value: unknown, min: number, max: number, argumentName: string): GuardResult {
        if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || min > max) {
            return { succeeded: false, message: `${argumentName} length bounds are invalid` };
        }
        if (typeof value !== 'string') {
            return { succeeded: false, message: `${argumentName} must be a string` };
        }
        if (value.length < min || value.length > max) {
            return { succeeded: false, message: `${argumentName} length must be between ${min} and ${max}` };
        }
        return { succeeded: true };
    }
}

function validateRangeBounds(min: number, max: number, argumentName: string): GuardResult | undefined {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
        return { succeeded: false, message: `${argumentName} range bounds are invalid` };
    }
    return undefined;
}
