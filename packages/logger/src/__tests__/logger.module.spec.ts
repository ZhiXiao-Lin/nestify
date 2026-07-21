import { Test } from '@nestjs/testing';
import { LoggerModule } from '../logger.module';
import { MODULE_OPTIONS_TOKEN } from '../logger.module-definition';
import { Logger, LoggerServiceImpl } from '../logger.service';
import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggerModule', () => {
    it('registers one logger token, an option-aware interceptor, and global defaults', () => {
        const dynamicModule = LoggerModule.register({ name: 'api', level: 'silent' });
        const loggerProviders = dynamicModule.providers?.filter(
            provider =>
                typeof provider === 'object' &&
                provider !== null &&
                'provide' in provider &&
                provider.provide === LoggerServiceImpl,
        );

        expect(Logger).toBe(LoggerServiceImpl);
        expect(dynamicModule.module).toBe(LoggerModule);
        expect(dynamicModule.global).toBe(true);
        expect(loggerProviders).toHaveLength(1);
        expect(dynamicModule.exports).toEqual([LoggerServiceImpl, LoggingInterceptor]);
    });

    it('honors local module registration instead of being forced global by a decorator', () => {
        expect(LoggerModule.register({ level: 'silent', isGlobal: false }).global).toBe(false);
    });

    it('resolves the logger and interceptor from a real Nest testing module', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                LoggerModule.register({
                    name: 'api',
                    level: 'silent',
                    interceptor: { excludePaths: ['/internal'] },
                }),
            ],
        }).compile();

        expect(moduleRef.get(LoggerServiceImpl)).toBeInstanceOf(LoggerServiceImpl);
        expect(moduleRef.get(LoggingInterceptor)).toBeInstanceOf(LoggingInterceptor);
        expect(moduleRef.get(MODULE_OPTIONS_TOKEN)).toMatchObject({ name: 'api' });
        await moduleRef.close();
    });

    it('supports asynchronous registration without duplicate providers', async () => {
        const dynamicModule = LoggerModule.registerAsync({
            isGlobal: false,
            useFactory: () => ({ name: 'async-api', level: 'silent' as const }),
        });
        expect(dynamicModule.global).toBe(false);

        const moduleRef = await Test.createTestingModule({ imports: [dynamicModule] }).compile();
        expect(moduleRef.get(LoggerServiceImpl)).toBeInstanceOf(LoggerServiceImpl);
        expect(moduleRef.get(LoggingInterceptor)).toBeInstanceOf(LoggingInterceptor);
        await moduleRef.close();
    });
});
