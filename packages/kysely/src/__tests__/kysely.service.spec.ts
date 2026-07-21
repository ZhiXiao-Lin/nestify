import { Kysely } from 'kysely';
import { KyselyService } from '../kysely.service';
import { KyselyConfigurationError } from '../kysely-module-options.interface';
import { createDialect, createExternalInstance } from './test-helpers';

describe('KyselyService', () => {
    const baseDestroy = jest.spyOn(Kysely.prototype, 'destroy');

    beforeEach(() => {
        baseDestroy.mockReset();
    });

    afterAll(() => {
        baseDestroy.mockRestore();
    });

    it('rejects invalid and externally owned direct construction', () => {
        expect(() => new KyselyService(undefined as never)).toThrow(KyselyConfigurationError);
        expect(() => new KyselyService({ instance: createExternalInstance() })).toThrow(
            'Existing instances must be registered through KyselyModule',
        );
    });

    it('coalesces explicit and lifecycle destroy calls', async () => {
        const deferred = createDeferred<void>();
        baseDestroy.mockReturnValue(deferred.promise);
        const service = new KyselyService({ config: { dialect: createDialect() } });

        const explicitDestroy = service.destroy();
        const lifecycleDestroy = service.onModuleDestroy();
        expect(baseDestroy).toHaveBeenCalledTimes(1);

        deferred.resolve();
        await Promise.all([explicitDestroy, lifecycleDestroy]);
        await service.destroy();

        expect(baseDestroy).toHaveBeenCalledTimes(1);
    });

    it('keeps a failed destroy result idempotent', async () => {
        const failure = new Error('close failed');
        baseDestroy.mockRejectedValue(failure);
        const service = new KyselyService({ config: { dialect: createDialect() } });

        await expect(service.destroy()).rejects.toBe(failure);
        await expect(service.onModuleDestroy()).rejects.toBe(failure);
        expect(baseDestroy).toHaveBeenCalledTimes(1);
    });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolvePromise: ((value: T) => void) | undefined;
    const promise = new Promise<T>(resolve => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve: value => resolvePromise?.(value),
    };
}
