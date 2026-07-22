import * as kyselyPackage from '../index';

describe('public API', () => {
    it('exports module, service, configuration, PostgreSQL, and logger helpers', () => {
        expect(kyselyPackage).toEqual(
            expect.objectContaining({
                KyselyModule: expect.any(Function),
                KyselyService: expect.any(Function),
                KyselyConfigurationError: expect.any(Function),
                normalizeKyselyModuleOptions: expect.any(Function),
                createPostgresPoolConfig: expect.any(Function),
                createPostgresKyselyConfig: expect.any(Function),
                createPostgresKyselyModuleOptions: expect.any(Function),
                createKyselyLogger: expect.any(Function),
            }),
        );
    });
});
