// ============================================================================
// OpenAPI Common DTOs - Reusable documentation objects
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationParamsDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    page?: number;

    @ApiPropertyOptional({ description: 'Page size', default: 20, minimum: 1, maximum: 100 })
    pageSize?: number;
}

export class IdParamDto {
    @ApiProperty({ description: 'Unique identifier' })
    id: string;
}

export class SlugParamDto {
    @ApiProperty({ description: 'URL-friendly identifier' })
    slug: string;
}

export class CreatedAtFilterDto {
    @ApiPropertyOptional({ description: 'Filter by creation date (from)', example: '2024-01-01T00:00:00Z' })
    createdFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by creation date (to)', example: '2024-12-31T23:59:59Z' })
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
