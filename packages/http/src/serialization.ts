import { Module } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';

export abstract class Serializer<Entity, Dto> {
    abstract toDto(entity: Entity): Dto;

    toDtoList(entities: Entity[]): Dto[] {
        return entities.map(entity => this.toDto(entity));
    }
}

export type ClassType<T = unknown> = new (...args: any[]) => T;

export interface SerializationTransformOptions {
    excludeExtraneousValues?: boolean;
}

export function transformToInstance<T>(
    plain: Record<string, unknown>,
    cls: ClassType<T>,
    options?: SerializationTransformOptions,
): T {
    return plainToInstance(cls, plain, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
        enableImplicitConversion: true,
    });
}

export function transformToPlain<T>(entity: T, options?: SerializationTransformOptions): Record<string, unknown> {
    return instanceToPlain(entity, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
    }) as Record<string, unknown>;
}

export function transformListToInstance<T>(
    plainList: Record<string, unknown>[],
    cls: ClassType<T>,
    options?: SerializationTransformOptions,
): T[] {
    return plainToInstance(cls, plainList, {
        excludeExtraneousValues: options?.excludeExtraneousValues ?? true,
        enableImplicitConversion: true,
    });
}

export function transformListToPlain<T>(
    entities: T[],
    options?: SerializationTransformOptions,
): Record<string, unknown>[] {
    return entities.map(entity => transformToPlain(entity, options));
}

export type Mapper<Entity, Dto> = (entity: Entity) => Dto;

export function toDto<Entity, Dto>(mapper: Mapper<Entity, Dto>): Mapper<Entity, Dto> {
    return mapper;
}

export function toDtoList<Entity, Dto>(mapper: Mapper<Entity, Dto>): (entities: Entity[]) => Dto[] {
    return (entities: Entity[]) => entities.map(mapper);
}

@Module({})
export class SerializationModule {}
