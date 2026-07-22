import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiOperation,
    ApiProperty,
    ApiPropertyOptional,
    ApiResponse,
    getSchemaPath,
    ApiForbiddenResponse as SwaggerApiForbiddenResponse,
    ApiUnauthorizedResponse as SwaggerApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { API_SUCCESS_MESSAGE, API_SUCCESS_STATUS } from './api-response';
import { StatusCode } from './exceptions';

export class ApiSuccessEnvelopeDto {
    @ApiProperty({ description: 'HTTP status code', example: 200 })
    code!: number;

    @ApiProperty({ description: 'Business status', example: API_SUCCESS_STATUS })
    status!: string;

    @ApiProperty({ description: 'Response message', example: API_SUCCESS_MESSAGE })
    message!: string;

    @ApiPropertyOptional({ description: 'Business data' })
    data?: unknown;

    @ApiPropertyOptional({ description: 'Request ID' })
    requestId?: string;

    @ApiProperty({ description: 'Timestamp' })
    timestamp!: string;
}

export class ApiErrorEnvelopeDto {
    @ApiProperty({ description: 'HTTP status code' })
    code!: number;

    @ApiProperty({ description: 'Business status', enum: Object.values(StatusCode) })
    status!: string;

    @ApiProperty({ description: 'Error message' })
    message!: string;

    @ApiPropertyOptional({ description: 'Error details' })
    details?: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Request ID' })
    requestId?: string;

    @ApiProperty({ description: 'Timestamp' })
    timestamp!: string;
}

export class ApiPaginatedDataDto {
    @ApiProperty({ description: 'Items', type: 'array', items: { type: 'object' } })
    items!: unknown[];

    @ApiProperty({ description: 'Total count' })
    total!: number;

    @ApiProperty({ description: 'Current page' })
    page!: number;

    @ApiProperty({ description: 'Page size' })
    limit!: number;

    @ApiProperty({ description: 'Total pages' })
    totalPages!: number;

    @ApiProperty({ description: 'Whether a next page exists' })
    hasNext!: boolean;

    @ApiProperty({ description: 'Whether a previous page exists' })
    hasPrevious!: boolean;
}

export class PaginationParamsDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    page?: number;

    @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
    pageSize?: number;
}

export class IdParamDto {
    @ApiProperty({ description: 'Unique identifier' })
    id!: string;
}

export class SlugParamDto {
    @ApiProperty({ description: 'URL-friendly identifier' })
    slug!: string;
}

export class CreatedAtFilterDto {
    @ApiPropertyOptional({ description: 'Filter by creation date from', example: '2024-01-01T00:00:00Z' })
    createdFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by creation date to', example: '2024-12-31T23:59:59Z' })
    createdTo?: string;
}

export class StatusFilterDto {
    @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'inactive', 'pending'] })
    status?: string;
}

export class SearchQueryDto {
    @ApiPropertyOptional({ description: 'Search query', example: 'keyword' })
    q?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    page?: number;

    @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
    pageSize?: number;
}

type OpenApiModelType = Function | [Function];
type ErrorResponseOptions = string | { description?: string };

function resolveModelType(type?: OpenApiModelType): { model?: Function; isArray: boolean } {
    if (!type) return { isArray: false };
    if (Array.isArray(type)) return { model: type[0], isArray: true };
    return { model: type, isArray: false };
}

function successSchema(model: Function | undefined, isArray: boolean, code: number): Record<string, unknown> {
    const dataSchema = model
        ? isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) }
        : undefined;
    return {
        allOf: [
            { $ref: getSchemaPath(ApiSuccessEnvelopeDto) },
            {
                type: 'object',
                properties: {
                    code: { type: 'number', example: code },
                    ...(dataSchema ? { data: dataSchema } : {}),
                },
            },
        ],
    };
}

function errorDescription(options: ErrorResponseOptions | undefined, fallback: string): string {
    return typeof options === 'string' ? options : (options?.description ?? fallback);
}

function errorSchema(code: number, statusEnum: string, exampleMessage: string): Record<string, unknown> {
    return {
        allOf: [
            { $ref: getSchemaPath(ApiErrorEnvelopeDto) },
            {
                type: 'object',
                properties: {
                    code: { type: 'number', example: code },
                    status: { type: 'string', example: statusEnum },
                    message: { type: 'string', example: exampleMessage },
                },
            },
        ],
    };
}

export function ApiStandardResponse<T>(options: {
    status?: HttpStatus;
    summary?: string;
    description?: string;
    responseDescription?: string;
    type?: T;
    isArray?: boolean;
    deprecated?: boolean;
}) {
    const { status = 200, summary, description, responseDescription, type, deprecated } = options;
    const { model, isArray } = resolveModelType(type as OpenApiModelType);
    const decorators: Array<ClassDecorator | MethodDecorator> = [
        ApiOperation({ summary, description, deprecated }),
        ApiExtraModels(ApiSuccessEnvelopeDto),
    ];
    if (model) decorators.push(ApiExtraModels(model));
    decorators.push(
        ApiResponse({
            status,
            description: responseDescription || description || (status === 200 ? 'Success' : 'Response'),
            schema: successSchema(model, options.isArray || isArray, status),
        }),
    );
    return applyDecorators(...decorators);
}

export function ApiAuth(summary?: string) {
    return applyDecorators(
        ApiBearerAuth(),
        ApiOperation({ summary }),
        SwaggerApiUnauthorizedResponse({
            description: 'Unauthorized - Invalid or missing authentication token',
            schema: {
                ...errorSchema(401, StatusCode.UNAUTHORIZED, 'Authentication required'),
            },
        }),
    );
}

export function ApiPermission(resource: string, action: string, summary?: string) {
    return applyDecorators(
        ApiAuth(summary),
        SwaggerApiForbiddenResponse({
            description: 'Forbidden - Insufficient permissions',
            schema: {
                ...errorSchema(403, StatusCode.PERMISSION_DENIED, `Permission denied: ${resource}:${action}`),
            },
        }),
    );
}

export const ApiOkResponse = <T>(options: {
    summary?: string;
    description?: string;
    responseDescription?: string;
    type?: T;
    isArray?: boolean;
    deprecated?: boolean;
}) => ApiStandardResponse<T>({ status: HttpStatus.OK, ...options });

export const ApiCreatedResponse = <T>(options: {
    summary?: string;
    description?: string;
    responseDescription?: string;
    type?: T;
    deprecated?: boolean;
}) => ApiStandardResponse<T>({ status: HttpStatus.CREATED, ...options });

export function ApiNoContentResponse(
    options?: string | { summary?: string; description?: string; responseDescription?: string; deprecated?: boolean },
) {
    const summary = typeof options === 'string' ? options : options?.summary;
    const description = typeof options === 'string' ? undefined : options?.description;
    const deprecated = typeof options === 'string' ? undefined : options?.deprecated;
    const responseDescription =
        typeof options === 'string' ? options : (options?.responseDescription ?? options?.description ?? 'No content');
    return applyDecorators(
        ApiOperation({ summary, description, deprecated }),
        ApiResponse({ status: 204, description: responseDescription }),
    );
}

export function ApiRawResponse(options: {
    status?: HttpStatus;
    summary: string;
    description: string;
    responseDescription?: string;
    contentType?: string;
}) {
    const { status = HttpStatus.OK, summary, description, responseDescription, contentType } = options;
    return applyDecorators(
        ApiOperation({ summary, description }),
        ApiResponse({
            status,
            description: responseDescription || description,
            ...(contentType
                ? {
                      content: {
                          [contentType]: {
                              schema: { type: contentType.includes('json') ? 'object' : 'string' },
                          },
                      },
                  }
                : {}),
        }),
    );
}

export function ApiPaginatedResponse<T>(options: {
    summary?: string;
    type?: T;
    description?: string;
    responseDescription?: string;
    deprecated?: boolean;
}) {
    const { summary, type, description, responseDescription, deprecated } = options;
    const { model } = resolveModelType(type as OpenApiModelType);
    const decorators: Array<ClassDecorator | MethodDecorator> = [
        ApiOperation({ summary, description, deprecated }),
        ApiExtraModels(ApiSuccessEnvelopeDto, ApiPaginatedDataDto),
    ];
    if (model) decorators.push(ApiExtraModels(model));
    const itemsSchema = model ? { $ref: getSchemaPath(model) } : { type: 'object' };
    decorators.push(
        ApiResponse({
            status: 200,
            description: responseDescription || description || 'Paginated response',
            schema: {
                allOf: [
                    { $ref: getSchemaPath(ApiSuccessEnvelopeDto) },
                    {
                        type: 'object',
                        properties: {
                            code: { type: 'number', example: 200 },
                            data: {
                                allOf: [
                                    { $ref: getSchemaPath(ApiPaginatedDataDto) },
                                    {
                                        type: 'object',
                                        properties: {
                                            items: { type: 'array', items: itemsSchema },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        }),
    );
    return applyDecorators(...decorators);
}

export function ApiBadRequestResponse(options: ErrorResponseOptions = 'Invalid request') {
    const description = errorDescription(options, 'Invalid request');
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({ status: 400, description, schema: errorSchema(400, StatusCode.BAD_REQUEST, description) }),
    );
}

export function ApiConflictResponse(options: ErrorResponseOptions = 'Conflict') {
    const description = errorDescription(options, 'Conflict');
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({ status: 409, description, schema: errorSchema(409, StatusCode.CONFLICT, description) }),
    );
}

export function ApiServerErrorResponse() {
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({
            status: 500,
            description: 'Internal Server Error',
            schema: errorSchema(500, StatusCode.INTERNAL_SERVER_ERROR, 'An unexpected error occurred'),
        }),
    );
}

export function ApiUnauthorizedResponse(options: ErrorResponseOptions = 'Unauthorized') {
    const description = errorDescription(options, 'Unauthorized');
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({ status: 401, description, schema: errorSchema(401, StatusCode.UNAUTHORIZED, description) }),
    );
}

export function ApiForbiddenResponse(options: ErrorResponseOptions = 'Forbidden') {
    const description = errorDescription(options, 'Forbidden');
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({ status: 403, description, schema: errorSchema(403, StatusCode.FORBIDDEN, description) }),
    );
}

export function ApiNotFoundResponse(options: ErrorResponseOptions = 'Not found') {
    const description = errorDescription(options, 'Not found');
    return applyDecorators(
        ApiExtraModels(ApiErrorEnvelopeDto),
        ApiResponse({ status: 404, description, schema: errorSchema(404, StatusCode.NOT_FOUND, description) }),
    );
}

export function ApiCommonErrors() {
    return applyDecorators(
        ApiBadRequestResponse(),
        ApiUnauthorizedResponse(),
        ApiForbiddenResponse(),
        ApiServerErrorResponse(),
    );
}
