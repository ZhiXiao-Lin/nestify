// ============================================================================
// OpenAPI Common Decorators - Reusable API documentation decorators
// ============================================================================

import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOperation,
    ApiResponse,
    ApiExtraModels,
    getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseDto, PaginatedResponseDto } from '../api-response';

// ============================================================================
// Auth Decorators
// ============================================================================

export function ApiAuth(summary?: string) {
    return applyDecorators(
        ApiBearerAuth(),
        ApiOperation({ summary }),
        ApiUnauthorizedResponse({
            description: 'Unauthorized - Invalid or missing authentication token',
            schema: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'UNAUTHORIZED' },
                    message: { type: 'string', example: 'Authentication required' },
                },
            },
        }),
    );
}

export function ApiPermission(resource: string, action: string, summary?: string) {
    return applyDecorators(
        ApiAuth(summary),
        ApiForbiddenResponse({
            description: 'Forbidden - Insufficient permissions',
            schema: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'PERMISSION_DENIED' },
                    message: { type: 'string', example: `Permission denied: ${resource}:${action}` },
                },
            },
        }),
    );
}

// ============================================================================
// Standard Response Decorators
// ============================================================================

export function ApiStandardResponse<T>(options: {
    status?: HttpStatus;
    summary?: string;
    description?: string;
    type?: T;
    isArray?: boolean;
    schema?: Record<string, unknown>;
}) {
    const { status = 200, summary, description, type, isArray, schema } = options;
    const code = status;

    const responseDecorators = [
        ApiOperation({ summary, description }),
        ApiResponse({
            status: code,
            description: description || (code === 200 ? 'Success' : 'Response'),
            schema: schema || {
                type: 'object',
                properties: {
                    code: { type: 'number', example: code },
                    message: { type: 'string', example: 'Success' },
                    data: schema
                        ? schema
                        : isArray
                            ? { type: 'array', items: type ? { $ref: getSchemaPath(type as any) } : {} }
                            : type
                                ? { $ref: getSchemaPath(type as any) }
                                : {},
                    requestId: { type: 'string' },
                    timestamp: { type: 'string' },
                },
            },
        }),
    ];

    return applyDecorators(...responseDecorators);
}

export function ApiCreatedResponse<T>(options: {
    summary?: string;
    type?: T;
    description?: string;
}) {
    return ApiStandardResponse<T>({
        status: HttpStatus.CREATED,
        ...options,
    });
}

export function ApiNoContentResponse(summary?: string) {
    return applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 204,
            description: 'No Content',
        }),
    );
}

// ============================================================================
// Paginated Response Decorators
// ============================================================================

export function ApiPaginatedResponse<T>(options: {
    summary?: string;
    type?: T;
    description?: string;
}) {
    const { summary, type, description } = options;

    return applyDecorators(
        ApiExtraModels(PaginatedResponseDto),
        ApiOperation({ summary, description }),
        ApiResponse({
            status: 200,
            description: description || 'Paginated response',
            schema: {
                type: 'object',
                properties: {
                    code: { type: 'number', example: 200 },
                    message: { type: 'string', example: 'Success' },
                    data: {
                        type: 'object',
                        properties: {
                            items: {
                                type: 'array',
                                items: type ? { $ref: getSchemaPath(type as any) } : {},
                            },
                            total: { type: 'number', example: 100 },
                            page: { type: 'number', example: 1 },
                            pageSize: { type: 'number', example: 20 },
                            totalPages: { type: 'number', example: 5 },
                            hasNext: { type: 'boolean', example: true },
                            hasPrevious: { type: 'boolean', example: false },
                        },
                    },
                    requestId: { type: 'string' },
                    timestamp: { type: 'string' },
                },
            },
        }),
    );
}

// ============================================================================
// Error Response Decorators
// ============================================================================

export function ApiBadRequestResponse(description = 'Bad Request - Invalid input') {
    return ApiResponse({
        status: 400,
        description,
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'BAD_REQUEST' },
                message: { type: 'string', example: 'Validation failed' },
                details: { type: 'object' },
                requestId: { type: 'string' },
                timestamp: { type: 'string' },
            },
        },
    });
}

export function ApiNotFoundResponse(resource = 'Resource') {
    return ApiResponse({
        status: 404,
        description: `${resource} not found`,
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: `${resource} not found` },
                requestId: { type: 'string' },
                timestamp: { type: 'string' },
            },
        },
    });
}

export function ApiConflictResponse(description = 'Conflict - Resource already exists') {
    return ApiResponse({
        status: 409,
        description,
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'CONFLICT' },
                message: { type: 'string', example: description },
                requestId: { type: 'string' },
                timestamp: { type: 'string' },
            },
        },
    });
}

export function ApiServerErrorResponse() {
    return applyDecorators(
        ApiResponse({
            status: 500,
            description: 'Internal Server Error',
            schema: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
                    message: { type: 'string', example: 'An unexpected error occurred' },
                    requestId: { type: 'string' },
                    timestamp: { type: 'string' },
                },
            },
        }),
        ApiInternalServerErrorResponse({
            description: 'Internal Server Error',
        }),
    );
}
