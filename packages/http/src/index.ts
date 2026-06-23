import {
    ArgumentsHost,
    BadRequestException as NestBadRequestException,
    CallHandler,
    Catch,
    ExecutionContext,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NestInterceptor,
    SetMetadata,
    ValidationPipe,
    type ValidationPipeOptions,
    applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiForbiddenResponse as SwaggerApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOperation,
    ApiProperty,
    ApiPropertyOptional,
    ApiResponse,
    ApiUnauthorizedResponse as SwaggerApiUnauthorizedResponse,
    getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
    registerDecorator,
    type ValidationArguments,
    type ValidationError,
    type ValidationOptions,
    type ValidatorOptions,
} from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DomainValidationError } from '@a3s-lab/ddd';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface RequestIdCarrier {
    headers?: Record<string, string | string[] | undefined>;
    id?: string;
}

export interface ResponseHeaderCarrier {
    headersSent?: boolean;
    setHeader(name: string, value: string): unknown;
}

export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function getOrCreateRequestId(request: RequestIdCarrier): string {
    const requestId =
        firstHeaderValue(request.headers?.[REQUEST_ID_HEADER]) ||
        firstHeaderValue(request.headers?.[CORRELATION_ID_HEADER]) ||
        request.id ||
        randomUUID();

    request.id = requestId;
    return requestId;
}

export function getOrCreateCorrelationId(request: RequestIdCarrier, fallback?: string): string {
    return (
        firstHeaderValue(request.headers?.[CORRELATION_ID_HEADER]) ||
        fallback ||
        request.id ||
        getOrCreateRequestId(request)
    );
}

export function attachRequestIdHeader(response: ResponseHeaderCarrier, requestId: string): void {
    if (!response.headersSent) {
        response.setHeader(REQUEST_ID_HEADER, requestId);
    }
}

export function attachCorrelationIdHeader(response: ResponseHeaderCarrier, correlationId: string): void {
    if (!response.headersSent) {
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
    }
}

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

export const API_SUCCESS_STATUS = 'SUCCESS' as const;
export const API_SUCCESS_MESSAGE = 'Success';
export type ApiSuccessStatus = typeof API_SUCCESS_STATUS;

export class ApiResponseDto<T = unknown> {
    @ApiProperty({ description: 'HTTP status code', example: 200 })
    code!: number;

    @ApiProperty({ description: 'Business status', example: API_SUCCESS_STATUS })
    status!: ApiSuccessStatus;

    @ApiProperty({ description: 'Response message', example: API_SUCCESS_MESSAGE })
    message!: string;

    @ApiPropertyOptional({ description: 'Response payload' })
    data?: T;

    @ApiPropertyOptional({ description: 'Request ID for tracing' })
    requestId?: string;

    @ApiProperty({ description: 'Response timestamp' })
    timestamp!: string;

    constructor(partial?: Partial<ApiResponseDto<T>>) {
        Object.assign(this, partial);
        this.timestamp = this.timestamp || new Date().toISOString();
        this.status = this.status || API_SUCCESS_STATUS;
        this.message = this.message || API_SUCCESS_MESSAGE;
    }
}

export class ApiErrorResponseDto {
    @ApiProperty({ description: 'HTTP status code', example: 404 })
    code!: number;

    @ApiProperty({ description: 'Business status code', enum: Object.values(StatusCode) })
    status!: StatusCode;

    @ApiProperty({ description: 'Error message' })
    message!: string;

    @ApiPropertyOptional({ description: 'Error details' })
    details?: Record<string, unknown>;

    @ApiPropertyOptional({ description: 'Request ID for tracing' })
    requestId?: string;

    @ApiProperty({ description: 'Response timestamp' })
    timestamp!: string;

    constructor(partial?: Partial<ApiErrorResponseDto>) {
        Object.assign(this, partial);
        this.timestamp = this.timestamp || new Date().toISOString();
    }
}

export interface PageResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @ApiPropertyOptional({ description: 'Page size', default: 10, minimum: 1, maximum: 100 })
    limit?: number = 10;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Search keyword' })
    search?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Sort field' })
    sortBy?: string;

    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
    sortOrder?: 'asc' | 'desc' = 'desc';
}

export interface PaginationOptions {
    page: number;
    limit: number;
    offset: number;
}

export function parsePaginationOptions(query: PaginationQueryDto): PaginationOptions {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return { page, limit, offset: (page - 1) * limit };
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Items' })
    items!: T[];

    @ApiProperty({ description: 'Total item count' })
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

    constructor(partial: Partial<PaginatedResponseDto<T>>) {
        Object.assign(this, partial);
    }
}

export function toPaginatedResponse<T>(result: PageResult<T>): PaginatedResponseDto<T> {
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
    return new PaginatedResponseDto<T>({
        items: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrevious: result.page > 1,
    });
}

export class ApiResponseService {
    success<T>(data?: T, message = API_SUCCESS_MESSAGE, requestId?: string): ApiResponseDto<T> {
        return new ApiResponseDto<T>({ code: 200, status: API_SUCCESS_STATUS, message, data, requestId });
    }

    created<T>(data?: T, message = 'Created', requestId?: string): ApiResponseDto<T> {
        return new ApiResponseDto<T>({ code: 201, status: API_SUCCESS_STATUS, message, data, requestId });
    }

    paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
        return toPaginatedResponse({ items, total, page, limit });
    }

    error(
        status: StatusCode,
        message = getStatusMessage(status),
        details?: Record<string, unknown>,
        requestId?: string,
    ): ApiErrorResponseDto {
        return new ApiErrorResponseDto({
            code: StatusCodeHttpStatus[status],
            status,
            message,
            details,
            requestId,
        });
    }
}

export const SKIP_API_RESPONSE = 'skipApiResponse';
export const SkipApiResponse = () => SetMetadata(SKIP_API_RESPONSE, true);

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const skipResponseWrap = this.reflector.getAllAndOverride<boolean>(SKIP_API_RESPONSE, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipResponseWrap) {
            return next.handle();
        }

        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        return next.handle().pipe(
            map((data: unknown) => {
                if (response.headersSent || data instanceof ApiResponseDto) {
                    return data;
                }
                const code = response.statusCode || 200;
                if (code === 204) {
                    return undefined;
                }
                return {
                    code,
                    status: API_SUCCESS_STATUS,
                    message: API_SUCCESS_MESSAGE,
                    data,
                    requestId,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}

interface ErrorResponse {
    code: number;
    status: StatusCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalErrorFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        let errorResponse: ErrorResponse;
        let normalized = exception;

        if (normalized instanceof DomainValidationError) {
            normalized = new BusinessException({
                code: StatusCode.VALIDATION_ERROR,
                message: normalized.message,
                details: normalized.details,
            });
        }

        if (normalized instanceof BusinessException) {
            const status = StatusCodeHttpStatus[normalized.code] ?? 500;
            errorResponse = {
                code: status,
                status: normalized.code,
                message: normalized.message,
                details: normalized.details,
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.warn(`[${errorResponse.code}] ${errorResponse.message}`, {
                requestId,
                path: request.url,
                method: request.method,
            });
        } else if (normalized instanceof HttpException) {
            const status = normalized.getStatus();
            const exceptionResponse = normalized.getResponse();
            const code = this.getStatusCode(status, exceptionResponse);
            errorResponse = {
                code: status,
                status: code,
                message: this.extractMessage(exceptionResponse, code),
                details: this.extractDetails(exceptionResponse),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logByStatus(status, errorResponse.message, normalized, request, requestId);
        } else if (normalized instanceof Error) {
            errorResponse = {
                code: 500,
                status: StatusCode.INTERNAL_SERVER_ERROR,
                message: getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.error(`[500] ${normalized.message}`, normalized.stack, {
                requestId,
                path: request.url,
                method: request.method,
            });
        } else {
            errorResponse = {
                code: 500,
                status: StatusCode.INTERNAL_SERVER_ERROR,
                message: getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.error('[500] Unknown exception', normalized as Error, {
                requestId,
                path: request.url,
                method: request.method,
            });
        }

        response.status(errorResponse.code).json(errorResponse);
    }

    private getStatusCode(status: number, exceptionResponse: unknown): StatusCode {
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const maybeStatus = (exceptionResponse as Record<string, unknown>).status;
            if (typeof maybeStatus === 'string' && maybeStatus in StatusCode) {
                return maybeStatus as StatusCode;
            }
        }
        const statusToCode: Record<number, StatusCode> = {
            400: StatusCode.BAD_REQUEST,
            401: StatusCode.UNAUTHORIZED,
            403: StatusCode.FORBIDDEN,
            404: StatusCode.NOT_FOUND,
            409: StatusCode.CONFLICT,
            422: StatusCode.UNPROCESSABLE_ENTITY,
            429: StatusCode.TOO_MANY_REQUESTS,
            500: StatusCode.INTERNAL_SERVER_ERROR,
            502: StatusCode.EXTERNAL_SERVICE_ERROR,
            503: StatusCode.SERVICE_UNAVAILABLE,
            504: StatusCode.GATEWAY_TIMEOUT,
        };
        return statusToCode[status] || StatusCode.INTERNAL_SERVER_ERROR;
    }

    private extractMessage(exceptionResponse: unknown, code: StatusCode): string {
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const message = (exceptionResponse as Record<string, unknown>).message;
            if (typeof message === 'string') {
                return message;
            }
            if (Array.isArray(message)) {
                return getStatusMessage(code);
            }
        }
        if (typeof exceptionResponse === 'string') {
            return exceptionResponse;
        }
        return getStatusMessage(code);
    }

    private extractDetails(exceptionResponse: unknown): Record<string, unknown> | undefined {
        if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
            return undefined;
        }
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.fieldErrors)) {
            return { fieldErrors: resp.fieldErrors };
        }
        if (Array.isArray(resp.errors)) {
            return { fieldErrors: resp.errors };
        }
        if (resp.details && typeof resp.details === 'object' && !Array.isArray(resp.details)) {
            return resp.details as Record<string, unknown>;
        }
        if (Array.isArray(resp.message)) {
            return { messages: resp.message };
        }
        return undefined;
    }

    private logByStatus(
        status: number,
        message: string,
        exception: HttpException,
        request: Request,
        requestId: string,
    ): void {
        const context = { requestId, path: request.url, method: request.method };
        if (status >= 500) {
            this.logger.error(`[${status}] ${message}`, exception.stack, context);
        } else {
            this.logger.warn(`[${status}] ${message}`, context);
        }
    }
}

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
    const formatted: FieldValidationError[] = [];
    for (const error of errors) {
        const field = parentProperty ? `${parentProperty}.${error.property}` : error.property;
        if (error.constraints) {
            formatted.push({ field, messages: Object.values(error.constraints) });
        }
        if (error.children && error.children.length > 0) {
            formatted.push(...formatValidationErrors(error.children, field));
        }
    }
    return formatted;
}

export function createValidationPipe(options: ValidationPipeOptions = {}): ValidationPipe {
    return new ValidationPipe({
        ...options,
        transform: true,
        transformOptions: DEFAULT_TRANSFORM_OPTIONS,
        exceptionFactory: (errors: ValidationError[]) => {
            const fieldErrors = formatValidationErrors(errors);
            return new NestBadRequestException({
                status: StatusCode.VALIDATION_ERROR,
                message: getStatusMessage(StatusCode.VALIDATION_ERROR),
                fieldErrors,
            });
        },
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
    const minLen = options?.minLength ?? 8;
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
    const minLen = options?.minLength ?? 8;
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
    const minLen = options?.minLength ?? 3;
    const maxLen = options?.maxLength ?? 30;
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
    const maxLen = options?.maxLength ?? 64;
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
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    if (!value || typeof value !== 'string') return false;
                    return new RegExp(`^${prefix}_[a-zA-Z0-9]+$`).test(value);
                },
                defaultMessage() {
                    return `ID must start with '${prefix}_' followed by alphanumeric characters`;
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
    return (object: object, propertyName: string) => {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
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

export function IsInstanceOf<T extends new (...args: unknown[]) => unknown>(
    classType: T,
    validationOptions?: ValidationOptions,
) {
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
                type: 'object',
                properties: {
                    code: { type: 'string', example: StatusCode.UNAUTHORIZED },
                    message: { type: 'string', example: 'Authentication required' },
                },
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
                type: 'object',
                properties: {
                    code: { type: 'string', example: StatusCode.PERMISSION_DENIED },
                    message: { type: 'string', example: `Permission denied: ${resource}:${action}` },
                },
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
        ApiResponse({
            status: 500,
            description: 'Internal Server Error',
            schema: errorSchema(500, StatusCode.INTERNAL_SERVER_ERROR, 'An unexpected error occurred'),
        }),
        ApiInternalServerErrorResponse({
            description: 'Internal Server Error',
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
        ApiInternalServerErrorResponse({
            description: 'Internal server error',
            schema: errorSchema(500, StatusCode.INTERNAL_SERVER_ERROR, 'Internal server error'),
        }),
    );
}

export const API_VERSION_KEY = 'api_version';
export const API_DEPRECATED_KEY = 'isDeprecated';
export const API_SUNSET_DATE_KEY = 'sunsetDate';
export const ApiVersion = (version: string | string[]) => SetMetadata(API_VERSION_KEY, version);
export const Deprecated = () => SetMetadata(API_DEPRECATED_KEY, true);
export const Sunset = (date: Date) => SetMetadata(API_SUNSET_DATE_KEY, date);

export const DEFAULT_API_VERSION = '1';
export const SUPPORTED_API_VERSIONS = ['1'] as const;
export const API_VERSION_HEADER = 'x-api-version';
export const API_SUPPORTED_VERSIONS_HEADER = 'x-api-supported-versions';
export type SupportedApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];
export type ApiVersionSource = 'url' | 'x-api-version' | 'accept';

export interface ApiVersionedRequest extends Request {
    apiVersion?: string;
}

export interface RequestedApiVersion {
    source: ApiVersionSource;
    version: string;
}

export function normalizeApiVersion(version: string | null | undefined): string | null {
    if (!version) return null;
    const match = version.trim().match(/^v?(\d+)(?:\.0)?$/i);
    return match ? match[1] : null;
}

export function extractVersionFromUrl(url: string): string | null {
    const match = url.match(/^\/api\/v(\d+)(?=\/|$|\?)/);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromHeader(header: string | string[] | undefined): string | null {
    const headerValue = firstHeaderValue(header);
    if (!headerValue) return null;
    const match = headerValue.match(/(?:^|[.\s])v(\d+)(?:[+;,\s]|$)/i);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromCustomHeader(header: string | string[] | undefined): string | null {
    return normalizeApiVersion(firstHeaderValue(header));
}

export function shouldBypassApiVersioning(request: Pick<Request, 'originalUrl' | 'url'>): boolean {
    const requestUrl = request.originalUrl || request.url || '';
    return /^\/(?:v2|git)(?:\/|$|\?)/.test(requestUrl);
}

export function extractRequestedApiVersionCandidates(request: Request): RequestedApiVersion[] {
    if (shouldBypassApiVersioning(request)) return [];
    const requestUrl = request.originalUrl || request.url;
    const candidates: RequestedApiVersion[] = [];
    const urlVersion = extractVersionFromUrl(requestUrl);
    const customHeaderVersion = extractVersionFromCustomHeader(request.headers[API_VERSION_HEADER]);
    const acceptHeaderVersion = extractVersionFromHeader(request.headers.accept);
    if (urlVersion) candidates.push({ source: 'url', version: urlVersion });
    if (customHeaderVersion) candidates.push({ source: 'x-api-version', version: customHeaderVersion });
    if (acceptHeaderVersion) candidates.push({ source: 'accept', version: acceptHeaderVersion });
    return candidates;
}

export function assertConsistentApiVersion(candidates: RequestedApiVersion[]): void {
    const versions = [...new Set(candidates.map(candidate => candidate.version))];
    if (versions.length > 1) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Conflicting API version declarations',
            details: { requestedVersions: candidates, supportedVersions: [...SUPPORTED_API_VERSIONS] },
        });
    }
}

export function resolveRequestedApiVersion(candidates: RequestedApiVersion[]): string {
    assertConsistentApiVersion(candidates);
    return candidates[0]?.version || DEFAULT_API_VERSION;
}

export function extractRequestedApiVersion(request: Request): string {
    return resolveRequestedApiVersion(extractRequestedApiVersionCandidates(request));
}

export function isSupportedApiVersion(version: string): version is SupportedApiVersion {
    return SUPPORTED_API_VERSIONS.includes(version as SupportedApiVersion);
}

export function assertSupportedApiVersion(version: string): void {
    if (!isSupportedApiVersion(version)) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Unsupported API version',
            details: { requestedVersion: version, supportedVersions: [...SUPPORTED_API_VERSIONS] },
        });
    }
}

export function applyApiVersionHeaders(
    response: ResponseHeaderCarrier,
    version: string,
    options: { deprecated?: boolean; sunsetDate?: Date } = {},
): void {
    if (response.headersSent) return;
    response.setHeader(API_VERSION_HEADER, version);
    response.setHeader(API_SUPPORTED_VERSIONS_HEADER, SUPPORTED_API_VERSIONS.join(','));
    if (options.deprecated) response.setHeader('Deprecation', 'true');
    if (options.sunsetDate) response.setHeader('Sunset', options.sunsetDate.toUTCString());
}

@Injectable()
export class ApiVersioningInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<ApiVersionedRequest>();
        const response = http.getResponse<ResponseHeaderCarrier>();
        if (shouldBypassApiVersioning(request)) {
            return next.handle();
        }

        const versionCandidates = extractRequestedApiVersionCandidates(request);
        const requestedVersion = versionCandidates[0]?.version || DEFAULT_API_VERSION;
        request.apiVersion = requestedVersion;

        applyApiVersionHeaders(response, requestedVersion);
        assertConsistentApiVersion(versionCandidates);
        assertSupportedApiVersion(requestedVersion);

        const routeVersions = this.reflector.getAllAndOverride<string | string[] | undefined>(API_VERSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (routeVersions) {
            const allowedVersions = Array.isArray(routeVersions) ? routeVersions : [routeVersions];
            if (!allowedVersions.map(item => normalizeApiVersion(item)).includes(requestedVersion)) {
                throw new BusinessException({
                    code: StatusCode.BAD_REQUEST,
                    message: 'Endpoint does not support the requested API version',
                    details: { requestedVersion, endpointVersions: allowedVersions },
                });
            }
        }

        const isDeprecated = this.reflector.getAllAndOverride<boolean>(API_DEPRECATED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const sunsetDate = this.reflector.getAllAndOverride<Date | undefined>(API_SUNSET_DATE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        applyApiVersionHeaders(response, requestedVersion, { deprecated: isDeprecated, sunsetDate });
        return next.handle();
    }
}
