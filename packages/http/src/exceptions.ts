import { HttpException, HttpStatus } from '@nestjs/common';

export enum StatusCode {
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    GONE = 'GONE',
    PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
    UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    INVALID_OPERATION = 'INVALID_OPERATION',
    OPERATION_FAILED = 'OPERATION_FAILED',
    BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    TOKEN_MISSING = 'TOKEN_MISSING',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
    DEV_MODE_ONLY = 'DEV_MODE_ONLY',
    ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
    ENTITY_ALREADY_EXISTS = 'ENTITY_ALREADY_EXISTS',
    ENTITY_CONFLICT = 'ENTITY_CONFLICT',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
    EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
}

export const StatusMessages: Record<StatusCode, string> = {
    [StatusCode.BAD_REQUEST]: 'Invalid request parameters',
    [StatusCode.UNAUTHORIZED]: 'Authentication is required',
    [StatusCode.FORBIDDEN]: 'Permission denied',
    [StatusCode.NOT_FOUND]: 'Resource not found',
    [StatusCode.CONFLICT]: 'Resource conflict',
    [StatusCode.GONE]: 'Resource is gone',
    [StatusCode.PAYLOAD_TOO_LARGE]: 'Payload too large',
    [StatusCode.UNPROCESSABLE_ENTITY]: 'Request cannot be processed',
    [StatusCode.TOO_MANY_REQUESTS]: 'Too many requests',
    [StatusCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
    [StatusCode.NOT_IMPLEMENTED]: 'Not implemented',
    [StatusCode.SERVICE_UNAVAILABLE]: 'Service unavailable',
    [StatusCode.GATEWAY_TIMEOUT]: 'Gateway timeout',
    [StatusCode.VALIDATION_ERROR]: 'Validation failed',
    [StatusCode.DUPLICATE_ENTRY]: 'Duplicate entry',
    [StatusCode.RESOURCE_NOT_FOUND]: 'Resource not found',
    [StatusCode.INVALID_OPERATION]: 'Invalid operation',
    [StatusCode.OPERATION_FAILED]: 'Operation failed',
    [StatusCode.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
    [StatusCode.TOKEN_EXPIRED]: 'Token expired',
    [StatusCode.TOKEN_INVALID]: 'Token invalid',
    [StatusCode.TOKEN_MISSING]: 'Token missing',
    [StatusCode.PERMISSION_DENIED]: 'Permission denied',
    [StatusCode.ACCOUNT_DISABLED]: 'Account disabled',
    [StatusCode.DEV_MODE_ONLY]: 'This endpoint is only available in development mode',
    [StatusCode.ENTITY_NOT_FOUND]: 'Entity not found',
    [StatusCode.ENTITY_ALREADY_EXISTS]: 'Entity already exists',
    [StatusCode.ENTITY_CONFLICT]: 'Entity conflict',
    [StatusCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
    [StatusCode.EXTERNAL_SERVICE_TIMEOUT]: 'External service timeout',
    [StatusCode.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service unavailable',
};

export const StatusCodeHttpStatus: Record<StatusCode, number> = {
    [StatusCode.BAD_REQUEST]: 400,
    [StatusCode.UNAUTHORIZED]: 401,
    [StatusCode.FORBIDDEN]: 403,
    [StatusCode.NOT_FOUND]: 404,
    [StatusCode.CONFLICT]: 409,
    [StatusCode.GONE]: 410,
    [StatusCode.PAYLOAD_TOO_LARGE]: 413,
    [StatusCode.UNPROCESSABLE_ENTITY]: 422,
    [StatusCode.TOO_MANY_REQUESTS]: 429,
    [StatusCode.INTERNAL_SERVER_ERROR]: 500,
    [StatusCode.NOT_IMPLEMENTED]: 501,
    [StatusCode.SERVICE_UNAVAILABLE]: 503,
    [StatusCode.GATEWAY_TIMEOUT]: 504,
    [StatusCode.VALIDATION_ERROR]: 400,
    [StatusCode.DUPLICATE_ENTRY]: 409,
    [StatusCode.RESOURCE_NOT_FOUND]: 404,
    [StatusCode.INVALID_OPERATION]: 400,
    [StatusCode.OPERATION_FAILED]: 400,
    [StatusCode.BUSINESS_RULE_VIOLATION]: 400,
    [StatusCode.TOKEN_EXPIRED]: 401,
    [StatusCode.TOKEN_INVALID]: 401,
    [StatusCode.TOKEN_MISSING]: 401,
    [StatusCode.PERMISSION_DENIED]: 403,
    [StatusCode.ACCOUNT_DISABLED]: 403,
    [StatusCode.DEV_MODE_ONLY]: 403,
    [StatusCode.ENTITY_NOT_FOUND]: 404,
    [StatusCode.ENTITY_ALREADY_EXISTS]: 409,
    [StatusCode.ENTITY_CONFLICT]: 409,
    [StatusCode.EXTERNAL_SERVICE_ERROR]: 502,
    [StatusCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
    [StatusCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,
};

export function getStatusMessage(statusCode: string): string {
    return StatusMessages[statusCode as StatusCode] || 'An error occurred';
}

export interface BusinessExceptionOptions {
    code: StatusCode;
    message?: string;
    details?: Record<string, unknown>;
    httpStatus?: HttpStatus;
}

export class BusinessException extends HttpException {
    public readonly code: StatusCode;
    public readonly details?: Record<string, unknown>;

    constructor(options: BusinessExceptionOptions) {
        const httpStatus = options.httpStatus || StatusCodeHttpStatus[options.code] || 400;
        const message = options.message || getStatusMessage(options.code);
        super({ status: options.code, message, details: options.details }, httpStatus);
        this.code = options.code;
        this.details = options.details;
    }

    override getResponse(): Record<string, unknown> {
        return {
            status: this.code,
            message: this.message,
            details: this.details,
        };
    }
}

export class ValidationException extends BusinessException {
    constructor(message = getStatusMessage(StatusCode.VALIDATION_ERROR), details?: Record<string, unknown>) {
        super({ code: StatusCode.VALIDATION_ERROR, message, details });
    }
}

export class ResourceNotFoundException extends BusinessException {
    constructor(message = getStatusMessage(StatusCode.RESOURCE_NOT_FOUND)) {
        super({ code: StatusCode.RESOURCE_NOT_FOUND, message, httpStatus: HttpStatus.NOT_FOUND });
    }
}

export class ForbiddenBusinessException extends BusinessException {
    constructor(message = getStatusMessage(StatusCode.PERMISSION_DENIED)) {
        super({ code: StatusCode.PERMISSION_DENIED, message, httpStatus: HttpStatus.FORBIDDEN });
    }
}

export class UnauthorizedBusinessException extends BusinessException {
    constructor(message = getStatusMessage(StatusCode.UNAUTHORIZED)) {
        super({ code: StatusCode.UNAUTHORIZED, message, httpStatus: HttpStatus.UNAUTHORIZED });
    }
}

export class DevModeOnlyException extends BusinessException {
    constructor(message = getStatusMessage(StatusCode.DEV_MODE_ONLY)) {
        super({ code: StatusCode.DEV_MODE_ONLY, message, httpStatus: HttpStatus.FORBIDDEN });
    }
}
