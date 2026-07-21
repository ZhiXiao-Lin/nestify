import { SandboxModule } from '../sandbox.module';
import { MODULE_OPTIONS_TOKEN } from '../sandbox.module-definition';
import { SandboxService } from '../sandbox.service';

describe('SandboxModule', () => {
    const options = {
        connection: {
            apiUrl: 'https://api.box.test',
        },
    };

    it('registers the service and is non-global by default', () => {
        const module = SandboxModule.register(options);

        expect(module.module).toBe(SandboxModule);
        expect(module.global).toBe(false);
        expect(module.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useValue: options }),
                SandboxService,
            ]),
        );
        expect(module.exports).toEqual([SandboxService]);
    });

    it('supports async registration and an explicit global override', () => {
        const module = SandboxModule.registerAsync({
            isGlobal: true,
            useFactory: () => options,
        });

        expect(module.global).toBe(true);
        expect(module.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useFactory: expect.any(Function) }),
                SandboxService,
            ]),
        );
    });
});
