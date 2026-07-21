import { Test, type TestingModule } from '@nestjs/testing';
import { Kysely } from 'kysely';
import { KyselyModule } from '../kysely.module';
import { ASYNC_OPTIONS_TYPE, MODULE_OPTIONS_TOKEN } from '../kysely.module-definition';
import { KyselyService } from '../kysely.service';
import { KyselyConfigurationError } from '../kysely-module-options.interface';
import { createDialect, createExternalInstance } from './test-helpers';

describe('KyselyModule', () => {
    const baseDestroy = jest.spyOn(Kysely.prototype, 'destroy').mockResolvedValue(undefined);
    const config = { dialect: createDialect() };
    const modules: TestingModule[] = [];

    afterEach(async () => {
        await Promise.all(modules.splice(0).map(module => module.close()));
        baseDestroy.mockClear();
    });

    afterAll(() => {
        baseDestroy.mockRestore();
    });

    it('registers a globally scoped owned service by default', async () => {
        const dynamicModule = KyselyModule.register({ config });
        const module = await compile(dynamicModule);

        expect(dynamicModule.global).toBe(true);
        expect(module.get(KyselyService)).toBeInstanceOf(KyselyService);
        expect(module.get(MODULE_OPTIONS_TOKEN)).toEqual({ config });
    });

    it('supports scoped registration and destroys an owned service once', async () => {
        const dynamicModule = KyselyModule.register({ config, isGlobal: false });
        const module = await compile(dynamicModule);
        const service = module.get(KyselyService);

        expect(dynamicModule.global).toBe(false);
        await service.destroy();
        await module.close();
        modules.splice(modules.indexOf(module), 1);

        expect(baseDestroy).toHaveBeenCalledTimes(1);
    });

    it('resolves async options through the same validated provider', async () => {
        const factory = jest.fn(() => ({ config }));
        const dynamicModule = KyselyModule.registerAsync({ useFactory: factory });
        const module = await compile(dynamicModule);

        expect(dynamicModule.global).toBe(true);
        expect(module.get(KyselyService)).toBeInstanceOf(KyselyService);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('supports scoped async registration', () => {
        expect(KyselyModule.registerAsync({ useFactory: () => ({ config }), isGlobal: false }).global).toBe(false);
    });

    it('exposes but does not destroy an externally owned instance', async () => {
        const instance = createExternalInstance();
        const module = await compile(KyselyModule.register({ instance }));

        expect(module.get(KyselyService)).toBe(instance);
        await module.close();
        modules.splice(modules.indexOf(module), 1);

        expect(instance.destroy).not.toHaveBeenCalled();
        expect(baseDestroy).not.toHaveBeenCalled();
    });

    it('validates sync options immediately and async options during resolution', async () => {
        expect(() => KyselyModule.register({})).toThrow(KyselyConfigurationError);

        await expect(
            Test.createTestingModule({
                imports: [KyselyModule.registerAsync({ useFactory: () => ({}) } as typeof ASYNC_OPTIONS_TYPE)],
            }).compile(),
        ).rejects.toThrow(KyselyConfigurationError);
    });

    async function compile(dynamicModule: ReturnType<typeof KyselyModule.register>): Promise<TestingModule> {
        const module = await Test.createTestingModule({ imports: [dynamicModule] }).compile();
        modules.push(module);
        return module;
    }
});
