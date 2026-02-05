export class Guard {
    public static againstNullOrUndefined(argument: any, argumentName: string): Result {
        if (argument === null || argument === undefined) {
            return { succeeded: false, message: `${argumentName} is null or undefined` };
        }
        return { succeeded: true };
    }

    public static againstNullOrUndefinedBulk(args: GuardArgument[]): Result {
        for (const arg of args) {
            const result = this.againstNullOrUndefined(arg.argument, arg.argumentName);
            if (!result.succeeded) return result;
        }
        return { succeeded: true };
    }

    public static isOneOf(value: any, validValues: any[], argumentName: string): Result {
        let isValid = false;
        for (const validValue of validValues) {
            if (value === validValue) {
                isValid = true;
            }
        }

        if (isValid) {
            return { succeeded: true };
        } else {
            return {
                succeeded: false,
                message: `${argumentName} isn't oneOf the correct types in ${JSON.stringify(
                    validValues,
                )}. Got "${value}".`,
            };
        }
    }

    public static inRange(num: number, min: number, max: number, argumentName: string): Result {
        const isInRange = num >= min && num <= max;
        if (!isInRange) {
            return {
                succeeded: false,
                message: `${argumentName} is not within range ${min} to ${max}.`,
            };
        }
        return { succeeded: true };
    }

    public static allInRange(numbers: number[], min: number, max: number, argumentName: string): Result {
        let failingResult: Result | null = null;
        for (const num of numbers) {
            const numIsInRangeResult = this.inRange(num, min, max, argumentName);
            if (!numIsInRangeResult.succeeded) failingResult = numIsInRangeResult;
        }

        if (failingResult) {
            return { succeeded: false, message: `${argumentName} is not within the range.` };
        }
        return { succeeded: true };
    }
}

export interface GuardArgument {
    argument: any;
    argumentName: string;
}

export interface Result {
    succeeded: boolean;
    message?: string;
}
