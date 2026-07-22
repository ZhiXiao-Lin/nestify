import {
    KyselyConfigurationError,
    type KyselyModuleOptions,
    normalizeKyselyModuleOptions,
} from '../kysely-module-options.interface';
import { createDialect, createExternalInstance } from './test-helpers';

describe('Kysely module option validation', () => {
    it('accepts and freezes a valid dialect configuration', () => {
        const config = { dialect: createDialect() };
        const options = normalizeKyselyModuleOptions({ config });

        expect(options).toEqual({ config });
        expect(Object.isFrozen(options)).toBe(true);
    });

    it('accepts a structurally compatible external Kysely instance without config', () => {
        const instance = createExternalInstance();

        expect(normalizeKyselyModuleOptions({ instance })).toEqual({ config: undefined, instance });
    });

    it.each([
        ['missing options', undefined],
        ['missing config and instance', {}],
        ['invalid config', { config: 'postgres' }],
        ['missing dialect', { config: {} }],
        ['invalid instance', { instance: { destroy: jest.fn() } }],
    ])('rejects %s', (_name, options) => {
        expect(() => normalizeKyselyModuleOptions(options as never)).toThrow(KyselyConfigurationError);
    });

    it.each([
        'createDriver',
        'createQueryCompiler',
        'createAdapter',
        'createIntrospector',
    ] as const)('requires dialect.%s', method => {
        const dialect = createDialect() as unknown as Record<string, unknown>;
        dialect[method] = undefined;

        expect(() => normalizeKyselyModuleOptions({ config: { dialect } } as unknown as KyselyModuleOptions)).toThrow(
            `config.dialect.${method} must be a function.`,
        );
    });
});
