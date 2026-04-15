// ============================================================================
// Pagination DTO - Standardized pagination parameters
// ============================================================================

import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
    pageSize?: number = 20;
}

export class CursorPaginationQueryDto {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Cursor (last item ID)', required: false })
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
    limit?: number = 20;

    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    @ApiPropertyOptional({ description: 'Sort order', default: 'asc' })
    order?: 'asc' | 'desc' = 'asc';
}

export interface PaginationOptions {
    page: number;
    pageSize: number;
    limit: number;
    offset: number;
}

export interface CursorPaginationOptions {
    cursor: string | null;
    limit: number;
    order: 'asc' | 'desc';
}

export function parsePaginationOptions(query: PaginationQueryDto): PaginationOptions {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    return { page, pageSize, limit, offset };
}

export function parseCursorPaginationOptions(query: CursorPaginationQueryDto): CursorPaginationOptions {
    return {
        cursor: query.cursor ?? null,
        limit: query.limit ?? 20,
        order: query.order ?? 'asc',
    };
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Items in current page' })
    items: T[];

    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    pageSize: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Whether there is a previous page' })
    hasPrevious: boolean;

    constructor(partial: Partial<PaginatedResponseDto<T>>) {
        Object.assign(this, partial);
    }
}

export class CursorPaginatedResponseDto<T> {
    @ApiProperty({ description: 'Items in current page' })
    items: T[];

    @ApiProperty({ description: 'Cursor for next page', nullable: true })
    nextCursor: string | null;

    @ApiProperty({ description: 'Whether there is a next page' })
    hasMore: boolean;

    constructor(partial: Partial<CursorPaginatedResponseDto<T>>) {
        Object.assign(this, partial);
    }
}
