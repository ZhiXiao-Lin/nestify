export interface GuardArgument {
    argument: unknown;
    argumentName: string;
}

export interface GuardResult {
    succeeded: boolean;
    message?: string;
}

export class Guard {
    static combine(results: GuardResult[]): GuardResult {
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

    static againstNullOrUndefinedBulk(args: GuardArgument[]): GuardResult {
        return Guard.combine(args.map(arg => Guard.againstNullOrUndefined(arg.argument, arg.argumentName)));
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

    static againstEmptyString(argument: string, argumentName: string): GuardResult {
        if (argument.trim().length === 0) {
            return { succeeded: false, message: `${argumentName} is empty` };
        }
        return { succeeded: true };
    }

    static inRange(value: number, min: number, max: number, argumentName: string): GuardResult {
        if (value < min || value > max) {
            return { succeeded: false, message: `${argumentName} must be between ${min} and ${max}` };
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

    static greaterThan(value: number, min: number, argumentName: string): GuardResult {
        if (value <= min) {
            return { succeeded: false, message: `${argumentName} must be greater than ${min}` };
        }
        return { succeeded: true };
    }

    static againstInvalidLength(value: string, min: number, max: number, argumentName: string): GuardResult {
        if (value.length < min || value.length > max) {
            return { succeeded: false, message: `${argumentName} length must be between ${min} and ${max}` };
        }
        return { succeeded: true };
    }
}
