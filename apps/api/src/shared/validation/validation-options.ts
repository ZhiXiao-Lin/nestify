// ============================================================================
// Validation Options & Decorators
// ============================================================================

import {
    IsString,
    IsEmail,
    IsUUID,
    IsOptional,
    IsEnum,
    IsInt,
    IsPositive,
    MinLength,
    MaxLength,
    IsNotEmpty,
    IsIn,
    Matches,
    IsUrl,
    IsPhoneNumber,
    IsDateString,
    IsBoolean,
    ValidationOptions,
    ValidationArguments,
    registerDecorator,
} from 'class-validator';

/**
 * Common validation messages
 */
export const ValidationMessage = {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Invalid email address',
    INVALID_UUID: 'Invalid UUID format',
    INVALID_URL: 'Invalid URL format',
    MIN_LENGTH: (min: number) => `Minimum length is ${min} characters`,
    MAX_LENGTH: (max: number) => `Maximum length is ${max} characters`,
    MIN_VALUE: (min: number) => `Minimum value is ${min}`,
    MAX_VALUE: (max: number) => `Maximum value is ${max}`,
    INVALID_ENUM: (enumValues: string[]) =>
        `Must be one of: ${enumValues.join(', ')}`,
    INVALID_PHONE: 'Invalid phone number format',
    INVALID_DATE: 'Invalid date format (ISO 8601 expected)',
};

// ============================================================================
// String Validators
// ============================================================================

/**
 * Password field with strength requirements
 * Minimum 8 characters, at least one uppercase, one lowercase, one number
 */
export function IsPassword(options?: { minLength?: number; ValidationOptions?: ValidationOptions }) {
    const minLen = options?.minLength ?? 8;
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length < minLen) return false;
                    if (!/[A-Z]/.test(value)) return false;
                    if (!/[a-z]/.test(value)) return false;
                    if (!/[0-9]/.test(value)) return false;
                    return true;
                },
                defaultMessage() {
                    return `Password must be at least ${minLen} characters with uppercase, lowercase and number`;
                },
            },
        });
    };
}

/**
 * Strong password field - requires special character
 */
export function IsStrongPassword(options?: { minLength?: number; ValidationOptions?: ValidationOptions }) {
    const minLen = options?.minLength ?? 8;
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value || typeof value !== 'string') return false;
                    if (value.length < minLen) return false;
                    if (!/[A-Z]/.test(value)) return false;
                    if (!/[a-z]/.test(value)) return false;
                    if (!/[0-9]/.test(value)) return false;
                    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return false;
                    return true;
                },
                defaultMessage() {
                    return `Password must be at least ${minLen} characters with uppercase, lowercase, number and special character`;
                },
            },
        });
    };
}

/**
 * Username field - alphanumeric with underscores
 */
export function IsUsername(options?: { minLength?: number; maxLength?: number; ValidationOptions?: ValidationOptions }) {
    const minLen = options?.minLength ?? 3;
    const maxLen = options?.maxLength ?? 30;
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: string) {
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

/**
 * Slug field - lowercase alphanumeric with hyphens
 */
export function IsSlug(options?: { maxLength?: number; ValidationOptions?: ValidationOptions }) {
    const maxLen = options?.maxLength ?? 64;
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: options?.ValidationOptions,
            validator: {
                validate(value: string) {
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

/**
 * JSON string field
 */
export function IsJsonString(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
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

// ============================================================================
// ID Validators
// ============================================================================

/**
 * MongoDB ObjectId field
 */
export function IsObjectId(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value || typeof value !== 'string') return false;
                    return /^[a-fA-F0-9]{24}$/.test(value);
                },
                defaultMessage() {
                    return 'Invalid MongoDB ObjectId format';
                },
            },
        });
    };
}

/**
 * Custom ID field with prefix (e.g., user_xxx, org_xxx)
 */
export function IsPrefixedId(prefix: string, ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value || typeof value !== 'string') return false;
                    const pattern = new RegExp(`^${prefix}_[a-zA-Z0-9]+$`);
                    return pattern.test(value);
                },
                defaultMessage() {
                    return `ID must start with '${prefix}_' followed by alphanumeric characters`;
                },
            },
        });
    };
}

// ============================================================================
// Array Validators
// ============================================================================

/**
 * Non-empty array
 */
export function IsNonEmptyArray(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: unknown[]) {
                    return Array.isArray(value) && value.length > 0;
                },
                defaultMessage() {
                    return 'Array must not be empty';
                },
            },
        });
    };
}

/**
 * Array with unique items
 */
export function IsUniqueArray(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: unknown[]) {
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

// ============================================================================
// Date Validators
// ============================================================================

/**
 * ISO 8601 date string
 */
export function IsIso8601Date(ValidationOptions?: ValidationOptions) {
    return IsDateString(undefined, ValidationOptions);
}

/**
 * Future date
 */
export function IsFutureDate(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value) return false;
                    const date = new Date(value);
                    return date > new Date();
                },
                defaultMessage() {
                    return 'Date must be in the future';
                },
            },
        });
    };
}

/**
 * Past date
 */
export function IsPastDate(ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
                    if (!value) return false;
                    const date = new Date(value);
                    return date < new Date();
                },
                defaultMessage() {
                    return 'Date must be in the past';
                },
            },
        });
    };
}

// ============================================================================
// Range Validators
// ============================================================================

/**
 * Number in range (inclusive)
 */
export function IsInRange(min: number, max: number, ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: number) {
                    return typeof value === 'number' && value >= min && value <= max;
                },
                defaultMessage() {
                    return `Value must be between ${min} and ${max}`;
                },
            },
        });
    };
}

/**
 * String length in range
 */
export function IsLengthInRange(min: number, max: number, ValidationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: string) {
                    if (typeof value !== 'string') return false;
                    return value.length >= min && value.length <= max;
                },
                defaultMessage() {
                    return `Length must be between ${min} and ${max} characters`;
                },
            },
        });
    };
}

// ============================================================================
// Conditional Validators
// ============================================================================

/**
 * Match another field exactly
 */
export function MatchesField(
    field: string,
    message?: string,
    ValidationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: unknown, args: ValidationArguments) {
                    const objectToCompare = args.object as Record<string, unknown>;
                    return objectToCompare[field] === value;
                },
                defaultMessage() {
                    return message ?? `Must match '${field}'`;
                },
            },
        });
    };
}

// ============================================================================
// Type Validators
// ============================================================================

/**
 * Instance of specific class
 */
export function IsInstanceOf<T extends new (...args: unknown[]) => unknown>(
    classType: T,
    ValidationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
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

/**
 * Array of specific type/items
 */
export function IsArrayOf<T>(
    itemValidator: (value: unknown) => boolean,
    ValidationOptions?: ValidationOptions,
) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: ValidationOptions,
            validator: {
                validate(value: unknown[]) {
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
