// ============================================================================
// Error Codes - Standardized error codes for the application
// ============================================================================

export enum ErrorCode {
    // 4xx Client Errors
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    GONE = 'GONE',
    UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

    // Business Errors (10xxx)
    VALIDATION_ERROR = '10001',
    DUPLICATE_ENTRY = '10002',
    RESOURCE_NOT_FOUND = '10003',
    INVALID_OPERATION = '10004',
    OPERATION_FAILED = '10005',
    BUSINESS_RULE_VIOLATION = '10006',

    // Auth Errors (20xxx)
    TOKEN_EXPIRED = '20001',
    TOKEN_INVALID = '20002',
    TOKEN_MISSING = '20003',
    PERMISSION_DENIED = '20004',
    ACCOUNT_DISABLED = '20005',

    // Domain Errors (30xxx)
    ENTITY_NOT_FOUND = '30001',
    ENTITY_ALREADY_EXISTS = '30002',
    ENTITY_CONFLICT = '30003',

    // External Service Errors (40xxx)
    EXTERNAL_SERVICE_ERROR = '40001',
    EXTERNAL_SERVICE_TIMEOUT = '40002',
    EXTERNAL_SERVICE_UNAVAILABLE = '40003',
}

export const ErrorCodeHttpStatus: Record<ErrorCode, number> = {
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.GONE]: 410,
    [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
    [ErrorCode.TOO_MANY_REQUESTS]: 429,
    [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
    [ErrorCode.NOT_IMPLEMENTED]: 501,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.GATEWAY_TIMEOUT]: 504,
    // Business errors map to 400 by default
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.DUPLICATE_ENTRY]: 409,
    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.INVALID_OPERATION]: 400,
    [ErrorCode.OPERATION_FAILED]: 400,
    [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,
    // Auth errors
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.TOKEN_INVALID]: 401,
    [ErrorCode.TOKEN_MISSING]: 401,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.ACCOUNT_DISABLED]: 403,
    // Domain errors
    [ErrorCode.ENTITY_NOT_FOUND]: 404,
    [ErrorCode.ENTITY_ALREADY_EXISTS]: 409,
    [ErrorCode.ENTITY_CONFLICT]: 409,
    // External errors
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
    [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,
};
