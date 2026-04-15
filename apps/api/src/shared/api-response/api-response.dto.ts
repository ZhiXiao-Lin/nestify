// ============================================================================
// API Response DTO - Standardized API response wrapper
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
    @ApiProperty({ description: 'Response code', example: 200 })
    code: number;

    @ApiProperty({ description: 'Response message', example: 'Success' })
    message: string;

    @ApiPropertyOptional({ description: 'Response data' })
    data?: T;

    @ApiPropertyOptional({ description: 'Request ID for tracing' })
    requestId?: string;

    @ApiProperty({ description: 'Timestamp' })
    timestamp: string;

    constructor(partial: Partial<ApiResponseDto<T>>) {
        Object.assign(this, partial);
        this.timestamp = this.timestamp || new Date().toISOString();
    }
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Items array', type: () => Array })
    items: T[];

    @ApiProperty({ description: 'Total count' })
    total: number;

    @ApiProperty({ description: 'Current page' })
    page: number;

    @ApiProperty({ description: 'Page size' })
    pageSize: number;

    @ApiProperty({ description: 'Total pages' })
    totalPages: number;

    @ApiProperty({ description: 'Has next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Has previous page' })
    hasPrevious: boolean;

    constructor(partial: Partial<PaginatedResponseDto<T>>) {
        Object.assign(this, partial);
    }
}

export class ApiErrorResponseDto {
    @ApiProperty({ description: 'Error code', example: 'NOT_FOUND' })
    code: string;

    @ApiProperty({ description: 'Error message', example: 'Resource not found' })
    message: string;

    @ApiPropertyOptional({ description: 'Detailed error info' })
    details?: Record<string, unknown>;

    @ApiProperty({ description: 'Timestamp' })
    timestamp: string;

    @ApiPropertyOptional({ description: 'Request ID for tracing' })
    requestId?: string;

    constructor(partial: Partial<ApiErrorResponseDto>) {
        Object.assign(this, partial);
        this.timestamp = this.timestamp || new Date().toISOString();
    }
}
