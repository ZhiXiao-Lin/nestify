// ============================================================================
// Business Exception - Base exception for business logic errors
// ============================================================================

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeHttpStatus } from './error-codes';

export interface BusinessExceptionOptions {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    httpStatus?: HttpStatus;
}

export class BusinessException extends HttpException {
    public readonly code: ErrorCode;
    public readonly details?: Record<string, unknown>;

    constructor(options: BusinessExceptionOptions) {
        const httpStatus = options.httpStatus || ErrorCodeHttpStatus[options.code] || 400;

        super(
            {
                code: options.code,
                message: options.message,
                details: options.details,
            },
            httpStatus,
        );

        this.code = options.code;
        this.details = options.details;
    }

    getResponse(): Record<string, unknown> {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
}

// ============================================================================
// Common Business Exceptions
// ============================================================================

export class ValidationException extends BusinessException {
    constructor(message: string, details?: Record<string, unknown>) {
        super({
            code: ErrorCode.VALIDATION_ERROR,
            message,
            details,
        });
    }
}

export class NotFoundException extends BusinessException {
    constructor(resource: string, identifier?: string | number) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;

        super({
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message,
            httpStatus: HttpStatus.NOT_FOUND,
        });
    }
}

export class DuplicateEntryException extends BusinessException {
    constructor(resource: string, field: string, value: string) {
        super({
            code: ErrorCode.DUPLICATE_ENTRY,
            message: `${resource} with ${field} '${value}' already exists`,
            httpStatus: HttpStatus.CONFLICT,
        });
    }
}

export class ForbiddenException extends BusinessException {
    constructor(message = 'You do not have permission to perform this action') {
        super({
            code: ErrorCode.PERMISSION_DENIED,
            message,
            httpStatus: HttpStatus.FORBIDDEN,
        });
    }
}

export class UnauthorizedException extends BusinessException {
    constructor(message = 'Authentication required') {
        super({
            code: ErrorCode.UNAUTHORIZED,
            message,
            httpStatus: HttpStatus.UNAUTHORIZED,
        });
    }
}

export class OperationFailedException extends BusinessException {
    constructor(operation: string, reason?: string) {
        super({
            code: ErrorCode.OPERATION_FAILED,
            message: reason ? `${operation} failed: ${reason}` : `${operation} failed`,
        });
    }
}
