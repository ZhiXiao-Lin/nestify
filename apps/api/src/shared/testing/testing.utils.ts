// ============================================================================
// Testing Utils - Mock factories, fixtures, and test helpers
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

/**
 * Create a testing module with all required providers
 */
export async function createTestingModule(options: {
    imports?: any[];
    controllers?: any[];
    providers?: any[];
    mocks?: Map<any, any>;
    globalPipes?: any[];
}): Promise<TestingModule> {
    const { imports = [], controllers = [], providers = [], mocks = new Map(), globalPipes = [] } = options;

    // Create mock providers from mocks map
    const mockProviders = Array.from(mocks.entries()).map(([token, mock]) => ({
        provide: token,
        useValue: mock,
    }));

    return Test.createTestingModule({
        imports,
        controllers,
        providers: [...providers, ...mockProviders],
    })
        .compile();
}

/**
 * Create a mock for a class or token
 */
export function createMock<T>(overrides?: Partial<T>): jest.Mocked<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = jest.fn() as any;

    if (overrides) {
        Object.keys(overrides).forEach(key => {
            (mock as any)[key] = overrides[key as keyof T];
        });
    }

    return mock;
}

/**
 * Create a mock instance with spy methods
 */
export function createMockInstance<T>(classType: new (...args: any[]) => T): jest.Mocked<T> {
    const instance = Object.create(classType.prototype);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mock = jest.fn() as any;

    // Copy all methods from prototype
    const proto = classType.prototype;
    Object.getOwnPropertyNames(proto).forEach(key => {
        if (key !== 'constructor' && typeof (proto as any)[key] === 'function') {
            (mock as any)[key] = jest.fn();
            (instance as any)[key] = (mock as any)[key];
        }
    });

    return mock;
}

/**
 * Builder for creating test fixtures
 */
export class FixtureBuilder<T> {
    private data: Partial<T> = {};

    constructor(private defaultData: T) {
        this.data = { ...defaultData };
    }

    with<K extends keyof T>(key: K, value: T[K]): this {
        this.data[key] = value;
        return this;
    }

    withPartial(partial: Partial<T>): this {
        this.data = { ...this.data, ...partial };
        return this;
    }

    build(): T {
        return { ...this.defaultData, ...this.data } as T;
    }

    buildMany(count: number): T[] {
        return Array.from({ length: count }, () => this.build());
    }
}

/**
 * Create a fixture builder
 */
export function fixture<T>(defaultData: T): FixtureBuilder<T> {
    return new FixtureBuilder(defaultData);
}

/**
 * Create pagination test fixtures
 */
export function createPaginatedFixture<T>(items: T[], total: number, page = 1, pageSize = 20) {
    return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrevious: page > 1,
    };
}

/**
 * Mock JWT payload for tests
 */
export const mockJwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    roles: ['member'],
    permissions: ['read', 'write'],
    type: 'access' as const,
};

/**
 * Mock request with user
 */
export function createMockRequest(overrides?: Partial<Request>): Request {
    return {
        user: mockJwtPayload,
        headers: {},
        params: {},
        query: {},
        body: {},
        ...overrides,
    } as unknown as Request;
}

/**
 * Time mocking utilities
 */
export const TimeMock = {
    /** Freeze time to a specific date */
    freeze(date: Date = new Date()): void {
        jest.useFakeTimers();
        jest.setSystemTime(date);
    },

    /** Use real timers */
    useReal(): void {
        jest.useRealTimers();
    },

    /** Advance time by ms */
    advance(ms: number): void {
        jest.advanceTimersByTime(ms);
    },

    /** Set a date in the future */
    setFuture(days = 1): Date {
        const date = new Date();
        date.setDate(date.getDate() + days);
        jest.setSystemTime(date);
        return date;
    },
};

/**
 * Create a mock response
 */
export function createMockResponse() {
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };
    return res;
}

/**
 * Create a mock query builder for Kysely
 */
export function createMockQueryBuilder() {
    const queryBuilder: any = {
        selectFrom: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue([]),
        executeTakeFirst: jest.fn().mockResolvedValue(null),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue(null),
        insertInto: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        updateTable: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        deleteFrom: jest.fn().mockReturnThis(),
    };
    return queryBuilder;
}

/**
 * Create a mock Redis client
 */
export function createMockRedis() {
    return {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(0),
        keys: jest.fn().mockResolvedValue([]),
        expire: jest.fn().mockResolvedValue(1),
        zcard: jest.fn().mockResolvedValue(0),
        zrange: jest.fn().mockResolvedValue([]),
        zadd: jest.fn().mockResolvedValue(1),
        zremrangebyscore: jest.fn().mockResolvedValue(0),
        incrby: jest.fn().mockResolvedValue(1),
        decrby: jest.fn().mockResolvedValue(0),
        hset: jest.fn().mockResolvedValue(1),
        hget: jest.fn().mockResolvedValue(null),
        hgetall: jest.fn().mockResolvedValue({}),
        hdel: jest.fn().mockResolvedValue(1),
        pipeline: jest.fn().mockReturnValue({
            zremrangebyscore: jest.fn().mockReturnThis(),
            zadd: jest.fn().mockReturnThis(),
            zcard: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        }),
    };
}
