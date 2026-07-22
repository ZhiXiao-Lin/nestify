import {
    BadRequestException as NestBadRequestException,
    ValidationPipe,
    type ValidationPipeOptions,
} from '@nestjs/common';
import {
    IsDateString,
    registerDecorator,
    type ValidationArguments,
    type ValidationError,
    type ValidationOptions,
    type ValidatorOptions,
} from 'class-validator';
import { getStatusMessage, StatusCode } from './exceptions';
import { HttpConfigurationError, normalizeHttpText, normalizePositiveInteger } from './http-boundary';

export const DEFAULT_VALIDATOR_OPTIONS: ValidatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
};

export const DEFAULT_TRANSFORM_OPTIONS = {
    enableImplicitConversion: true,
};

export interface FieldValidationError {
    field: string;
    messages: string[];
}

export function formatValidationErrors(errors: ValidationError[], parentProperty = ''): FieldValidationError[] {
    return formatValidationErrorTree(errors, parentProperty, new WeakSet<object>(), { count: 0 }, 0);
}

function formatValidationErrorTree(
    errors: ValidationError[],
    parentProperty: string,
    seen: WeakSet<object>,
    state: { count: number },
    depth: number,
): FieldValidationError[] {
    const formatted: FieldValidationError[] = [];
    if (!Array.isArray(errors) || depth > 16) {
        return formatted;
    }
    for (const error of errors) {
        if (!error || typeof error !== 'object' || seen.has(error) || state.count >= 256) {
            continue;
        }
        seen.add(error);
        const property = normalizeHttpText(error.property, { fallback: '_', maxLength: 128 });
        const field = parentProperty ? `${parentProperty}.${property}` : property;
        if (error.constraints) {
            const messages = Object.values(error.constraints)
                .filter((message): message is string => typeof message === 'string')
                .slice(0, 32)
                .map(message => normalizeHttpText(message, { fallback: 'Invalid value', maxLength: 1_024 }));
            if (messages.length > 0) {
                formatted.push({ field, messages });
                state.count += 1;
            }
        }
        if (error.children && error.children.length > 0) {
            formatted.push(...formatValidationErrorTree(error.children, field, seen, state, depth + 1));
        }
    }
    return formatted;
}

export function createValidationPipe(options: ValidationPipeOptions = {}): ValidationPipe {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new HttpConfigurationError('Validation pipe options must be an object.');
    }
    return new ValidationPipe({
        ...DEFAULT_VALIDATOR_OPTIONS,
        ...options,
        transform: options.transform ?? true,
        transformOptions: { ...DEFAULT_TRANSFORM_OPTIONS, ...options.transformOptions },
        exceptionFactory:
            options.exceptionFactory ??
            ((errors: ValidationError[]) => {
                const fieldErrors = formatValidationErrors(errors);
                return new NestBadRequestException({
                    status: StatusCode.VALIDATION_ERROR,
                    message: getStatusMessage(StatusCode.VALIDATION_ERROR),
                    fieldErrors,
                });
            }),
    });
}

export const globalValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
});

export const strictValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false,
});

export const partialValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: true,
});

export const ValidationMessage = {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Invalid email address',
    INVALID_UUID: 'Invalid UUID format',
    INVALID_URL: 'Invalid URL format',
    MIN_LENGTH: (min: number) => `Minimum length is ${min} characters`,
    MAX_LENGTH: (max: number) => `Maximum length is ${max} characters`,
    MIN_VALUE: (min: number) => `Minimum value is ${min}`,
    MAX_VALUE: (max: number) => `Maximum value is ${max}`,
    INVALID_ENUM: (enumValues: string[]) => `Must be one of: ${enumValues.join(', ')}`,
    INVALID_PHONE: 'Invalid phone number format',
    INVALID_DATE: 'Invalid date format (ISO 8601 expected)',
};

export function IsPassword(options?: { minLength?: number; ValidationOptions?: ValidationOptions }) {
    const minLen = normalizePositiveInteger(options?.minLength, 'IsPassword.minLength', 8, 1, 1_024);
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length < minLen) return false;
                    if (!/[A-Z]/.test(value)) return false;
                    if (!/[a-z]/.test(value)) return false;
                    return /[0-9]/.test(value);
                },
                defaultMessage() {
                    return `Password must be at least ${minLen} characters with uppercase, lowercase and number`;
                },
            },
        });
    };
}

export function IsStrongPassword(options?: { minLength?: number; ValidationOptions?: ValidationOptions }) {
    const minLen = normalizePositiveInteger(options?.minLength, 'IsStrongPassword.minLength', 8, 1, 1_024);
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length < minLen) return false;
                    if (!/[A-Z]/.test(value)) return false;
                    if (!/[a-z]/.test(value)) return false;
                    if (!/[0-9]/.test(value)) return false;
                    return /[-!@#$%^&*()_+=[\]{};':"\\|,.<>/?]/.test(value);
                },
                defaultMessage() {
                    return `Password must be at least ${minLen} characters with uppercase, lowercase, number and special character`;
                },
            },
        });
    };
}

export function IsUsername(options?: {
    minLength?: number;
    maxLength?: number;
    ValidationOptions?: ValidationOptions;
}) {
    const minLen = normalizePositiveInteger(options?.minLength, 'IsUsername.minLength', 3, 1, 256);
    const maxLen = normalizePositiveInteger(options?.maxLength, 'IsUsername.maxLength', 30, 1, 256);
    assertRange(minLen, maxLen, 'IsUsername');
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length < minLen || value.length > maxLen) return false;
                    return /^[a-zA-Z0-9_]+$/.test(value);
                },
                defaultMessage() {
                    return `Username must be ${minLen}-${maxLen} alphanumeric characters or underscores`;
                },
            },
        });
    };
}

export function IsSlug(options?: { maxLength?: number; ValidationOptions?: ValidationOptions }) {
    const maxLen = normalizePositiveInteger(options?.maxLength, 'IsSlug.maxLength', 64, 1, 1_024);
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length > maxLen) return false;
                    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
                },
                defaultMessage() {
                    return 'Slug must be lowercase alphanumeric with hyphens (e.g., my-slug)';
                },
            },
        });
    };
}

export function IsJsonString(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    try {
                        JSON.parse(value);
                        return true;
                    } catch {
                        return false;
                    }
                },
                defaultMessage() {
                    return 'Invalid JSON string';
                },
            },
        });
    };
}

export function IsObjectId(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
                },
                defaultMessage() {
                    return 'Invalid MongoDB ObjectId format';
                },
            },
        });
    };
}

export function IsPrefixedId(prefix: string, validationOptions?: ValidationOptions) {
    const normalizedPrefix = normalizeHttpText(prefix, { maxLength: 64 });
    if (!normalizedPrefix) {
        throw new HttpConfigurationError('IsPrefixedId prefix must be a non-empty string.');
    }
    const pattern = new RegExp(`^${escapeRegExp(normalizedPrefix)}_[a-zA-Z0-9]+$`);
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    return pattern.test(value);
                },
                defaultMessage() {
                    return `ID must start with '${normalizedPrefix}_' followed by alphanumeric characters`;
                },
            },
        });
    };
}

export function IsNonEmptyArray(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    return Array.isArray(value) && value.length > 0;
                },
                defaultMessage() {
                    return 'Array must not be empty';
                },
            },
        });
    };
}

export function IsUniqueArray(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!Array.isArray(value)) return false;
                    return new Set(value).size === value.length;
                },
                defaultMessage() {
                    return 'Array must contain only unique items';
                },
            },
        });
    };
}

export function IsIso8601Date(validationOptions?: ValidationOptions) {
    return IsDateString(undefined, validationOptions);
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value) return false;
                    return new Date(String(value)) > new Date();
                },
                defaultMessage() {
                    return 'Date must be in the future';
                },
            },
        });
    };
}

export function IsPastDate(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value) return false;
                    return new Date(String(value)) < new Date();
                },
                defaultMessage() {
                    return 'Date must be in the past';
                },
            },
        });
    };
}

export function IsInRange(min: number, max: number, validationOptions?: ValidationOptions) {
    assertFiniteRange(min, max, 'IsInRange');
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    return typeof value === 'number' && value >= min && value <= max;
                },
                defaultMessage() {
                    return `Value must be between ${min} and ${max}`;
                },
            },
        });
    };
}

export function IsLengthInRange(min: number, max: number, validationOptions?: ValidationOptions) {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < 0) {
        throw new HttpConfigurationError('IsLengthInRange bounds must be non-negative safe integers.');
    }
    assertRange(min, max, 'IsLengthInRange');
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    return typeof value === 'string' && value.length >= min && value.length <= max;
                },
                defaultMessage() {
                    return `Length must be between ${min} and ${max} characters`;
                },
            },
        });
    };
}

export function MatchesField(field: string, message?: string, validationOptions?: ValidationOptions) {
    const normalizedField = normalizeHttpText(field, { maxLength: 128 });
    if (!normalizedField) {
        throw new HttpConfigurationError('MatchesField field must be a non-empty string.');
    }
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    const objectToCompare = args.object as Record<string, unknown>;
                    return objectToCompare[normalizedField] === value;
                },
                defaultMessage() {
                    return normalizeHttpText(message, {
                        fallback: `Must match '${normalizedField}'`,
                        maxLength: 1_024,
                    });
                },
            },
        });
    };
}

export function IsInstanceOf<T extends new (...args: unknown[]) => unknown>(
    classType: T,
    validationOptions?: ValidationOptions,
) {
    if (typeof classType !== 'function') {
        throw new HttpConfigurationError('IsInstanceOf classType must be a constructor.');
    }
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    return value instanceof classType;
                },
                defaultMessage() {
                    return `Must be an instance of ${classType.name}`;
                },
            },
        });
    };
}

export function IsArrayOf(itemValidator: (value: unknown) => boolean, validationOptions?: ValidationOptions) {
    if (typeof itemValidator !== 'function') {
        throw new HttpConfigurationError('IsArrayOf itemValidator must be a function.');
    }
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!Array.isArray(value)) return false;
                    return value.every(itemValidator);
                },
                defaultMessage() {
                    return 'All items must be valid';
                },
            },
        });
    };
}

function assertFiniteRange(min: number, max: number, name: string): void {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new HttpConfigurationError(`${name} bounds must be finite numbers.`);
    }
    assertRange(min, max, name);
}

function assertRange(min: number, max: number, name: string): void {
    if (min > max) {
        throw new HttpConfigurationError(`${name} minimum must be less than or equal to maximum.`);
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
