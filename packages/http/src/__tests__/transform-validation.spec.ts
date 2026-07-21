import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsInt, validate } from 'class-validator';
import { lastValueFrom, of } from 'rxjs';
import {
    BusinessException,
    createTransformOptions,
    createValidationPipe,
    formatValidationErrors,
    HttpConfigurationError,
    IsArrayOf,
    IsInRange,
    IsInstanceOf,
    IsLengthInRange,
    IsPassword,
    IsPrefixedId,
    IsUsername,
    MatchesField,
    TransformInterceptor,
    TransformModule,
    transformKeysToCamelCase,
    transformKeysToSnakeCase,
} from '../index';

describe('key and response transforms', () => {
    it('transforms nested null-prototype objects without prototype mutation', () => {
        const input = Object.create(null) as Record<string, unknown>;
        input.__proto__ = { polluted: true };
        input.resource_id = { child_name: 'one' };

        const result = transformKeysToSnakeCase(input);

        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(Object.hasOwn(result, '__proto__')).toBe(true);
        expect(result).toHaveProperty('resource_id.child_name', 'one');
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it('rejects collisions, cycles, depth exhaustion, and entry exhaustion', () => {
        expect(() => transformKeysToCamelCase({ foo_bar: 1, fooBar: 2 })).toThrow(BusinessException);

        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        expect(() => transformKeysToSnakeCase(cyclic)).toThrow('Circular');
        expect(() => transformKeysToCamelCase({ one: { two: 2 } }, { maxDepth: 1 })).toThrow('depth');
        expect(() => transformKeysToCamelCase({ one: 1, two: 2 }, { maxEntries: 1 })).toThrow('entry');
    });

    it('validates key and response transform configuration', () => {
        expect(
            createTransformOptions({ transformResponse: false, wrapperKey: 'payload', includeMetadata: false }),
        ).toEqual({
            transformRequest: true,
            transformResponse: false,
            wrapperKey: 'payload',
            includeMetadata: false,
        });
        expect(() => createTransformOptions({ wrapperKey: '__proto__' })).toThrow(HttpConfigurationError);
        expect(() => createTransformOptions({ wrapperKey: '_meta' })).toThrow(HttpConfigurationError);
        expect(() => transformKeysToCamelCase({}, { maxDepth: 0 })).toThrow(HttpConfigurationError);
    });

    it('supports custom wrapping and disabling response transforms', async () => {
        const request = { headers: { 'x-request-id': 'req-transform' }, url: '/items?secret=1', method: 'get' };
        const response = { headersSent: false, setHeader: jest.fn() };
        const wrapped = new TransformInterceptor({ wrapperKey: 'payload', includeMetadata: false });
        const passthrough = new TransformInterceptor({ transformResponse: false });

        await expect(
            lastValueFrom(wrapped.intercept(createContext(request, response), { handle: () => of({ id: 'one' }) })),
        ).resolves.toEqual({ payload: { id: 'one' } });
        await expect(
            lastValueFrom(passthrough.intercept(createContext(request, response), { handle: () => of('raw') })),
        ).resolves.toBe('raw');
    });

    it('exposes validated sync and async transform modules', async () => {
        const syncModule = TransformModule.register({ wrapperKey: 'payload' });
        const asyncModule = TransformModule.registerAsync({ useFactory: async () => ({ transformResponse: false }) });
        const provider = asyncModule.providers?.[0] as { useFactory: () => Promise<unknown> };

        expect(syncModule.providers).toHaveLength(1);
        await expect(provider.useFactory()).resolves.toMatchObject({ transformResponse: false });
        expect(() => TransformModule.registerAsync({ useFactory: undefined } as never)).toThrow(HttpConfigurationError);
    });
});

describe('validation boundaries', () => {
    class NumericInput {
        @Type(() => Number)
        @IsInt()
        count!: number;
    }

    it('applies strict defaults and implicit conversion', async () => {
        const pipe = createValidationPipe();
        const result = await pipe.transform({ count: '2' }, { type: 'body', metatype: NumericInput, data: undefined });

        expect(result).toBeInstanceOf(NumericInput);
        expect(result.count).toBe(2);
        await expect(
            pipe.transform({ count: '2', unexpected: true }, { type: 'body', metatype: NumericInput, data: undefined }),
        ).rejects.toMatchObject({ status: 400 });
    });

    it('preserves an explicit transform flag and custom exception factory', async () => {
        const marker = new Error('custom-validation');
        const pipe = createValidationPipe({ transform: false, exceptionFactory: () => marker });

        await expect(
            pipe.transform({ count: 'invalid' }, { type: 'body', metatype: NumericInput, data: undefined }),
        ).rejects.toBe(marker);
        expect(() => createValidationPipe(null as never)).toThrow(HttpConfigurationError);
    });

    it('formats nested validation trees defensively', () => {
        const child = { property: 'name\nvalue', constraints: { required: 'is required\nnow' }, children: [] };
        const parent = { property: 'profile', children: [child] };
        child.children.push(parent as never);

        expect(formatValidationErrors([parent])).toEqual([
            { field: 'profile.name value', messages: ['is required now'] },
        ]);
        expect(formatValidationErrors(null as never)).toEqual([]);
    });

    it('escapes prefixed-id expressions rather than treating prefixes as regex', async () => {
        class Input {
            @IsPrefixedId('user.+')
            id!: string;
        }

        expect(await validate(Object.assign(new Input(), { id: 'user.+_abc123' }))).toHaveLength(0);
        expect(await validate(Object.assign(new Input(), { id: 'userZZ_abc123' }))).toHaveLength(1);
    });

    it('rejects invalid reusable decorator configuration immediately', () => {
        expect(() => IsPassword({ minLength: 0 })).toThrow(HttpConfigurationError);
        expect(() => IsUsername({ minLength: 10, maxLength: 2 })).toThrow(HttpConfigurationError);
        expect(() => IsInRange(Number.NaN, 2)).toThrow(HttpConfigurationError);
        expect(() => IsLengthInRange(3, 2)).toThrow(HttpConfigurationError);
        expect(() => MatchesField('')).toThrow(HttpConfigurationError);
        expect(() => IsInstanceOf(null as never)).toThrow(HttpConfigurationError);
        expect(() => IsArrayOf(null as never)).toThrow(HttpConfigurationError);
    });
});

function createContext(request: Record<string, unknown>, response: Record<string, unknown>) {
    return {
        getHandler: () => () => undefined,
        getClass: () => class TestController {},
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as never;
}
