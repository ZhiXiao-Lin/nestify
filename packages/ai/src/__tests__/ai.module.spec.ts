import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

        expect(definition.global).toBe(false);
        expect(definition.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: AI_MODULE_OPTIONS, useValue: options }),
                AiService,
            ]),
        );
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
        expect(moduleRef.get(AiService)).toBeInstanceOf(AiService);
        await moduleRef.close();
    });

    it('keeps async registration non-global unless requested', () => {
        const factory = () => ({ configSource: 'agent.acl' });

        expect(AiModule.registerAsync({ useFactory: factory }).global).toBe(false);
        expect(AiModule.registerAsync({ useFactory: factory, isGlobal: true }).global).toBe(true);
    });
});
