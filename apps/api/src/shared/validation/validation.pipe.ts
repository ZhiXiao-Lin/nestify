// ============================================================================
// Validation Pipe - Global validation configuration
// ============================================================================

import {
    ValidationPipe,
    ValidationPipeOptions,
    BadRequestException,
} from '@nestjs/common';
import { ValidatorOptions, ValidationError } from 'class-validator';

/**
 * Default validator options for class-validator
 */
export const DEFAULT_VALIDATOR_OPTIONS: ValidatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
};

/**
 * Default transform options
 */
export const DEFAULT_TRANSFORM_OPTIONS = {
    enableImplicitConversion: true,
};

/**
 * Transform NestJS ValidationError to readable format
 */
export function formatValidationErrors(
    errors: ValidationError[],
    parentProperty = '',
): Array<{ field: string; constraints: string[] }> {
    const formatted: Array<{ field: string; constraints: string[] }> = [];

    for (const error of errors) {
        const field = parentProperty
            ? `${parentProperty}.${error.property}`
            : error.property;

        if (error.constraints) {
            formatted.push({
                field,
                constraints: Object.values(error.constraints),
            });
        }

        if (error.children && error.children.length > 0) {
            formatted.push(
                ...formatValidationErrors(error.children, field),
            );
        }
    }

    return formatted;
}

/**
 * Create a ValidationPipe with standardized configuration
 */
export function createValidationPipe(
    options: ValidationPipeOptions = {},
): ValidationPipe {
    return new ValidationPipe({
        ...options,
        transform: true,
        transformOptions: DEFAULT_TRANSFORM_OPTIONS,
        exceptionFactory: (errors: ValidationError[]) => {
            const formatted = formatValidationErrors(errors);
            return new BadRequestException({
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                errors: formatted,
            });
        },
    });
}

/**
 * Default global validation pipe instance
 */
export const globalValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
});

/**
 * Strict validation pipe (for DTOs that must be exact)
 */
export const strictValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false,
});

/**
 * Partial validation pipe (for optional/update DTOs)
 */
export const partialValidationPipe = createValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: true,
});
