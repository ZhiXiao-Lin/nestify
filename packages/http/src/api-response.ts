import {
    CallHandler,
    ExecutionContext,
    Global,
    Injectable,
    Module,
    NestInterceptor,
    SetMetadata,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessException, getStatusMessage, StatusCode, StatusCodeHttpStatus } from './exceptions';
import {
    HttpConfigurationError,
    normalizeHttpStatus,
    normalizeHttpText,
    normalizePublicDetails,
} from './http-boundary';
import { attachRequestIdHeader, getOrCreateRequestId, normalizeRequestId } from './request-id';

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
        this.code = partial?.code ?? 200;
        this.status = API_SUCCESS_STATUS;
        this.message = partial?.message ?? API_SUCCESS_MESSAGE;
        this.data = partial?.data;
        this.requestId = normalizeRequestId(partial?.requestId);
        this.timestamp = partial?.timestamp ?? new Date().toISOString();
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
        this.code = partial?.code ?? 500;
        this.status = partial?.status ?? StatusCode.INTERNAL_SERVER_ERROR;
        this.message = normalizeHttpText(partial?.message, {
            fallback: getStatusMessage(this.status),
            maxLength: 1_024,
        });
        this.details = normalizePublicDetails(partial?.details);
        this.requestId = normalizeRequestId(partial?.requestId);
        this.timestamp = partial?.timestamp ?? new Date().toISOString();
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
    if (!query || typeof query !== 'object') {
        throw paginationError('Pagination query must be an object.');
    }
    const page = validatePaginationInteger(query.page ?? 1, 'page', 1, Number.MAX_SAFE_INTEGER);
    const limit = validatePaginationInteger(query.limit ?? 10, 'limit', 1, 100);
    if (page > Math.floor(Number.MAX_SAFE_INTEGER / limit)) {
        throw paginationError('Pagination offset exceeds the safe integer range.');
    }
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
    if (!result || typeof result !== 'object' || !Array.isArray(result.items)) {
        throw paginationError('Paginated result must contain an items array.');
    }
    const total = validatePaginationInteger(result.total, 'total', 0, Number.MAX_SAFE_INTEGER);
    const page = validatePaginationInteger(result.page, 'page', 1, Number.MAX_SAFE_INTEGER);
    const limit = validatePaginationInteger(result.limit, 'limit', 1, 100);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return new PaginatedResponseDto<T>({
        items: result.items,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
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
        if (!Object.values(StatusCode).includes(status)) {
            throw new HttpConfigurationError('status must be a valid StatusCode.');
        }
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

        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        if (skipResponseWrap) {
            return next.handle();
        }

        return next.handle().pipe(
            map((data: unknown) => {
                if (response.headersSent || isApiResponseEnvelope(data)) {
                    return data;
                }
                const code = normalizeHttpStatus(response.statusCode, 200);
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

function validatePaginationInteger(value: unknown, field: string, minimum: number, maximum: number): number {
    if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
        throw paginationError(`${field} must be an integer between ${minimum} and ${maximum}.`, field);
    }
    return value as number;
}

function paginationError(message: string, field?: string): BusinessException {
    return new BusinessException({
        code: StatusCode.VALIDATION_ERROR,
        message,
        details: field ? { field } : undefined,
    });
}

function isApiResponseEnvelope(value: unknown): boolean {
    if (value instanceof ApiResponseDto || value instanceof ApiErrorResponseDto) {
        return true;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const record = value as Record<string, unknown>;
    return (
        typeof record.code === 'number' &&
        typeof record.status === 'string' &&
        typeof record.message === 'string' &&
        typeof record.timestamp === 'string'
    );
}

@Global()
@Module({
    providers: [ApiResponseService, { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor }],
    exports: [ApiResponseService],
})
export class ApiResponseModule {}
