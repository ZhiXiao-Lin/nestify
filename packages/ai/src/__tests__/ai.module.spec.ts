import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiConfigurationError } from '../ai.errors';
import { AiModule } from '../ai.module';
import { AiService } from '../ai.service';
import { AI_MODULE_OPTIONS, type AiModuleOptions } from '../ai.types';

@Module({
    providers: [{ provide: 'CONFIG_SOURCE', useValue: 'agent.acl' }],
    exports: ['CONFIG_SOURCE'],
})
class ConfigFixtureModule {}

describe('AiModule', () => {
    it('registers as non-global by default and exports AiService', () => {
        const options: AiModuleOptions = {
            configSource: 'default_model = "test/model"',
            runtimeLoader: jest.fn(),
        };
        const definition = AiModule.register(options);
        const provider = definition.providers?.find(
            candidate => typeof candidate === 'object' && candidate !== null && 'provide' in candidate,
        ) as { useValue: Readonly<AiModuleOptions> };

        expect(definition.global).toBe(false);
        expect(definition.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: AI_MODULE_OPTIONS, useValue: expect.objectContaining(options) }),
                AiService,
            ]),
        );
        expect(provider.useValue).not.toBe(options);
        expect(Object.isFrozen(provider.useValue)).toBe(true);
        expect(definition.exports).toContain(AiService);
    });

    it('supports explicit global registration without changing the default', () => {
        expect(AiModule.register({ configSource: 'agent.acl', isGlobal: true }).global).toBe(true);
        expect(AiModule.register({ configSource: 'agent.acl' }).global).toBe(false);
    });

    it('resolves registerAsync options through Nest dependency injection', async () => {
        const configSource = 'agent.acl';
        const moduleRef = await Test.createTestingModule({
            imports: [
                AiModule.registerAsync({
                    imports: [ConfigFixtureModule],
                    useFactory: (source: string) => ({ configSource: source }),
                    inject: ['CONFIG_SOURCE'],
                }),
            ],
        }).compile();

        expect(moduleRef.get(AI_MODULE_OPTIONS)).toEqual({ configSource });
        expect(Object.isFrozen(moduleRef.get(AI_MODULE_OPTIONS))).toBe(true);
        expect(moduleRef.get(AiService)).toBeInstanceOf(AiService);
        await moduleRef.close();
    });

    it('keeps async registration non-global unless requested', () => {
        const factory = () => ({ configSource: 'agent.acl' });

        expect(AiModule.registerAsync({ useFactory: factory }).global).toBe(false);
        expect(AiModule.registerAsync({ useFactory: factory, isGlobal: true }).global).toBe(true);
    });

    it('rejects invalid sync and async registration before native runtime loading', async () => {
        expect(() => AiModule.register({ configSource: '' })).toThrow(AiConfigurationError);
        expect(() => AiModule.register({ configSource: 'agent.acl', isGlobal: 'yes' as never })).toThrow(
            'must be a boolean',
        );
        expect(() => AiModule.register({ configSource: 'agent.acl', runtimeLoader: 'loader' as never })).toThrow(
            'runtimeLoader',
        );
        expect(() => AiModule.registerAsync(null as never)).toThrow('async options are required');
        expect(() => AiModule.registerAsync({ useFactory: undefined as never })).toThrow('requires a useFactory');
        expect(() =>
            AiModule.registerAsync({ useFactory: () => ({ configSource: 'agent.acl' }), isGlobal: 'yes' as never }),
        ).toThrow('isGlobal must be a boolean');

        await expect(
            Test.createTestingModule({
                imports: [AiModule.registerAsync({ useFactory: async () => ({ configSource: ' ' }) })],
            }).compile(),
        ).rejects.toBeInstanceOf(AiConfigurationError);
    });
});
