import type { Dialect, Kysely } from 'kysely';

export function createDialect(): Dialect {
    return {
        createDriver: jest.fn(() => ({})) as Dialect['createDriver'],
        createQueryCompiler: jest.fn(() => ({})) as Dialect['createQueryCompiler'],
        createAdapter: jest.fn(() => ({})) as Dialect['createAdapter'],
        createIntrospector: jest.fn(() => ({})) as Dialect['createIntrospector'],
    };
}

export function createExternalInstance(): Kysely<unknown> {
    return {
        selectFrom: jest.fn(),
        destroy: jest.fn().mockResolvedValue(undefined),
    } as unknown as Kysely<unknown>;
}
