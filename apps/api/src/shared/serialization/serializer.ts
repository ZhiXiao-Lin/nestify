// ============================================================================
// Serializer - Entity ↔ DTO mapping
// ============================================================================

import { instanceToPlain, plainToInstance } from 'class-transformer';

/**
 * Base serializer class for Entity ↔ DTO mapping
 *
 * Usage:
 * ```typescript
 * class UserSerializer extends Serializer<User, UserDto> {
 *   protected static _instance: UserSerializer;
 *
 *   static get instance(): UserSerializer {
 *     return this._instance || (this._instance = new UserSerializer());
 *   }
 *
 *   toDto(entity: User): UserDto {
 *     return {
 *       id: entity.id,
 *       email: entity.email,
 *       ...
 *     };
 *   }
 * }
 * ```
 *
 * Or use the simpler functional approach:
 * ```typescript
 * const userToDto = (user: User): UserDto => ({
 *   id: user.id,
 *   email: user.email,
 *   ...
 * });
 *
 * const userToDtoList = (users: User[]): UserDto[] => users.map(userToDto);
 * ```
 */
export abstract class Serializer<Entity, Dto> {
    /**
     * Convert Entity to DTO
     */
    abstract toDto(entity: Entity): Dto;

    /**
     * Convert list of Entities to DTOs
     */
    toDtoList(entities: Entity[]): Dto[] {
        return entities.map(entity => this.toDto(entity));
    }
}

/**
 * Type for class constructors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClassType<T = any> = new (...args: any[]) => T;

/**
 * Transform a plain object to a class instance
 */
export function transformToInstance<T>(
    plain: Record<string, unknown>,
    cls: ClassType<T>,
    options?: { excludeExtraneousValues?: boolean },
): T {
    return plainToInstance(cls, plain, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
        enableImplicitConversion: true,
    });
}

/**
 * Transform an object to a plain JavaScript object
 */
export function transformToPlain<T>(
    entity: T,
    options?: { excludeExtraneousValues?: boolean },
): Record<string, unknown> {
    return instanceToPlain(entity, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
    }) as Record<string, unknown>;
}

/**
 * Transform list of plain objects to class instances
 */
export function transformListToInstance<T>(
    plainList: Record<string, unknown>[],
    cls: ClassType<T>,
    options?: { excludeExtraneousValues?: boolean },
): T[] {
    return plainToInstance(cls, plainList, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
        enableImplicitConversion: true,
    });
}

/**
 * Transform list of objects to plain objects
 */
export function transformListToPlain<T>(entities: T[]): Record<string, unknown>[] {
    return entities.map(entity => transformToPlain(entity));
}

/**
 * Simple mapper function type
 */
export type Mapper<Entity, Dto> = (entity: Entity) => Dto;

/**
 * Create a mapper that converts entity to DTO
 */
export function toDto<Entity, Dto>(mapper: Mapper<Entity, Dto>): Mapper<Entity, Dto> {
    return mapper;
}

/**
 * Create a mapper that converts list of entities to DTOs
 */
export function toDtoList<Entity, Dto>(mapper: Mapper<Entity, Dto>): (entities: Entity[]) => Dto[] {
    return (entities: Entity[]) => entities.map(mapper);
}
