// ============================================================================
// Base Service - Generic CRUD operations with Kysely
// ============================================================================

import { KyselyService } from '@a3s-lab/kysely';
import { NotFoundException } from '@nestjs/common';
import { parsePaginationOptions, PaginationQueryDto } from './pagination.dto';

export interface FindOptions<FilterDto, SortDto> {
    filter?: FilterDto;
    sort?: SortDto;
    pagination?: PaginationQueryDto;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export abstract class BaseService<
    Entity extends { id: string },
    CreateDto,
    UpdateDto,
    FilterDto = never,
    SortDto = never,
> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(
        protected readonly kysely: KyselyService<any>,
        protected readonly tableName: string,
    ) {}

    /**
     * Create a new entity
     */
    async create(dto: CreateDto, additionalData?: Partial<Entity>): Promise<Entity> {
        const now = new Date();
        const entity: Partial<Entity> = {
            ...dto,
            ...additionalData,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        } as Partial<Entity>;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.kysely as any)
            .insertInto(this.tableName)
            .values(entity as Record<string, unknown>)
            .executeTakeFirstOrThrow();

        return entity as Entity;
    }

    /**
     * Find entity by ID
     */
    async findById(id: string): Promise<Entity | null> {
        const row = await (this.kysely as any).selectFrom(this.tableName).where('id', '=', id).executeTakeFirst();

        return (row as Entity) || null;
    }

    /**
     * Find entity by ID or throw NotFoundException
     */
    async findByIdOrThrow(id: string): Promise<Entity> {
        const entity = await this.findById(id);
        if (!entity) {
            throw new NotFoundException(`${this.tableName} with id '${id}' not found`);
        }
        return entity;
    }

    /**
     * Find all entities with pagination (optimized - uses SQL COUNT)
     */
    async findAll(options?: FindOptions<FilterDto, SortDto>): Promise<PaginatedResult<Entity>> {
        const paginationOptions = options?.pagination
            ? parsePaginationOptions(options.pagination)
            : { page: 1, pageSize: 20, limit: 20, offset: 0 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let baseQuery = (this.kysely as any).selectFrom(this.tableName);

        // Apply filters if FilterDto is provided
        if (options?.filter) {
            baseQuery = this.applyFilters(baseQuery, options.filter);
        }

        // Get total count using efficient SQL COUNT
        const countResult = await baseQuery.select((eb: any) => eb.fn.countAll().as('count')).executeTakeFirst();

        const total = Number(countResult?.count ?? 0);

        // Apply pagination and sorting to a separate query
        let dataQuery = baseQuery.limit(paginationOptions.limit).offset(paginationOptions.offset);

        if (options?.sort) {
            dataQuery = this.applySort(dataQuery, options.sort);
        }

        const items = await dataQuery.execute();

        return {
            items: items as Entity[],
            total,
            page: paginationOptions.page,
            pageSize: paginationOptions.pageSize,
            totalPages: Math.ceil(total / paginationOptions.pageSize),
        };
    }

    /**
     * Find entities with pagination using cursor-based approach (for large datasets)
     */
    async findAllCursor(
        cursor: string | null,
        limit: number,
        options?: FindOptions<FilterDto, SortDto>,
    ): Promise<{ items: Entity[]; nextCursor: string | null }> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (this.kysely as any).selectFrom(this.tableName);

        if (options?.filter) {
            query = this.applyFilters(query, options.filter);
        }

        // Cursor-based pagination using id > cursor
        if (cursor) {
            query = query.where('id', '>', cursor);
        }

        query = query.orderBy('id', 'asc').limit(limit + 1); // Fetch one extra to check if there's more

        const items = await query.execute();
        const hasMore = items.length > limit;
        const result = hasMore ? items.slice(0, -1) : items;

        return {
            items: result as Entity[],
            nextCursor: hasMore ? (result[result.length - 1] as Entity).id : null,
        };
    }

    /**
     * Update entity by ID
     */
    async update(id: string, dto: UpdateDto): Promise<Entity> {
        const existing = await this.findByIdOrThrow(id);

        const updated: Partial<Entity> = {
            ...existing,
            ...dto,
            id: existing.id,
            createdAt: (existing as any).createdAt,
            updatedAt: new Date(),
        } as Partial<Entity>;

        await (this.kysely as any)
            .updateTable(this.tableName)
            .set(updated as Record<string, unknown>)
            .where('id', '=', id)
            .executeTakeFirst();

        return updated as Entity;
    }

    /**
     * Update entities by filter (batch update)
     */
    async updateMany(filter: FilterDto, dto: Partial<UpdateDto>): Promise<number> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (this.kysely as any).updateTable(this.tableName).set({
            ...dto,
            updatedAt: new Date(),
        } as Record<string, unknown>);

        query = this.applyFilters(query, filter);

        const result = await query.execute();
        return result.numUpdatedRows ?? 0;
    }

    /**
     * Delete entity by ID (hard delete)
     */
    async delete(id: string): Promise<void> {
        await this.findByIdOrThrow(id);

        await (this.kysely as any).deleteFrom(this.tableName).where('id', '=', id).executeTakeFirst();
    }

    /**
     * Soft delete entity by ID
     */
    async softDelete(id: string, deletedBy?: string): Promise<void> {
        await this.findByIdOrThrow(id);

        await (this.kysely as any)
            .updateTable(this.tableName)
            .set({
                deletedAt: new Date(),
                deletedBy,
                updatedAt: new Date(),
            } as Record<string, unknown>)
            .where('id', '=', id)
            .executeTakeFirst();
    }

    /**
     * Soft delete entities by filter (batch)
     */
    async softDeleteMany(filter: FilterDto, deletedBy?: string): Promise<number> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (this.kysely as any).updateTable(this.tableName).set({
            deletedAt: new Date(),
            deletedBy,
            updatedAt: new Date(),
        } as Record<string, unknown>);

        query = this.applyFilters(query, filter);

        const result = await query.execute();
        return result.numUpdatedRows ?? 0;
    }

    /**
     * Check if entity exists
     */
    async exists(id: string): Promise<boolean> {
        const entity = await (this.kysely as any)
            .selectFrom(this.tableName)
            .select('id')
            .where('id', '=', id)
            .executeTakeFirst();

        return !!entity;
    }

    /**
     * Count entities with optional filters (efficient SQL COUNT)
     */
    async count(filter?: FilterDto): Promise<number> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (this.kysely as any).selectFrom(this.tableName).select((eb: any) => eb.fn.countAll().as('count'));

        if (filter) {
            query = this.applyFilters(query, filter);
        }

        const result = await query.executeTakeFirst();
        return Number(result?.count ?? 0);
    }

    /**
     * Insert many entities (batch insert)
     */
    async createMany(dtos: CreateDto[]): Promise<Entity[]> {
        if (dtos.length === 0) return [];

        const now = new Date();
        const entities = dtos.map(dto => ({
            ...dto,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        })) as Array<Record<string, unknown>>;

        await (this.kysely as any).insertInto(this.tableName).values(entities).executeTakeFirst();

        return entities as unknown as Entity[];
    }

    /**
     * Apply filters to query (override in subclasses)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected applyFilters(qb: any, _filter: FilterDto): any {
        return qb;
    }

    /**
     * Apply sorting to query (override in subclasses)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected applySort(qb: any, _sort: SortDto): any {
        return qb;
    }
}
