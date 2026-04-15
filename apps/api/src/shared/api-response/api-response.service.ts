// ============================================================================
// API Response Service - Factory for creating standardized responses
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
    ApiResponseDto,
    PaginatedResponseDto,
    ApiErrorResponseDto,
} from './api-response.dto';

@Injectable()
export class ApiResponseService {
    private readonly logger = new Logger(ApiResponseService.name);

    /**
     * Create a success response
     */
    success<T>(data?: T, message = 'Success', requestId?: string): ApiResponseDto<T> {
        return new ApiResponseDto<T>({
            code: 200,
            message,
            data,
            requestId,
        });
    }

    /**
     * Create a created response (201)
     */
    created<T>(data?: T, message = 'Created', requestId?: string): ApiResponseDto<T> {
        return new ApiResponseDto<T>({
            code: 201,
            message,
            data,
            requestId,
        });
    }

    /**
     * Create an accepted response (202)
     */
    accepted<T>(data?: T, message = 'Accepted', requestId?: string): ApiResponseDto<T> {
        return new ApiResponseDto<T>({
            code: 202,
            message,
            data,
            requestId,
        });
    }

    /**
     * Create a no content response (204)
     */
    noContent(requestId?: string): ApiResponseDto<null> {
        return new ApiResponseDto<null>({
            code: 204,
            message: 'No Content',
            requestId,
        });
    }

    /**
     * Create a paginated response
     */
    paginated<T>(
        items: T[],
        total: number,
        page: number,
        pageSize: number,
        message = 'Success',
        requestId?: string,
    ): PaginatedResponseDto<T> {
        const totalPages = Math.ceil(total / pageSize);

        return new PaginatedResponseDto<T>({
            items,
            total,
            page,
            pageSize,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        });
    }

    /**
     * Create an error response
     */
    error(
        code: string,
        message: string,
        details?: Record<string, unknown>,
        requestId?: string,
    ): ApiErrorResponseDto {
        return new ApiErrorResponseDto({
            code,
            message,
            details,
            requestId,
        });
    }

    /**
     * Get request ID from request object
     */
    getRequestId(request: Request): string | undefined {
        return (
            (request.headers['x-request-id'] as string) ||
            (request.headers['x-correlation-id'] as string) ||
            undefined
        );
    }
}
