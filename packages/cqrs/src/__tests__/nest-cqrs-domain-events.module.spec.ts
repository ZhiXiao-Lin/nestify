import 'reflect-metadata';
import { DOMAIN_EVENT_PUBLISHER } from '@a3s-lab/ddd';
import { Injectable, Module } from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import {
    CqrsDomainEventConfigurationError,
    NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
    NestCqrsDomainEventPublisher,
    NestCqrsDomainEventsModule,
} from '../index';

@Module({
    providers: [{ provide: 'BATCH_MODE', useValue: 'parallel' }],
    exports: ['BATCH_MODE'],
})
class ConfigFixtureModule {}

@Injectable()
class CqrsConsumer {
    constructor(readonly commandBus: CommandBus) {}
}

describe('NestCqrsDomainEventsModule', () => {
    it('registers a non-global ordered publisher by default', () => {
        const definition = NestCqrsDomainEventsModule.register();

        expect(definition.global).toBe(false);
        expect(definition.imports).toContain(CqrsModule);
        expect(definition.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
                    useValue: { mode: 'ordered', maxConcurrency: 8, maxBatchSize: 1000 },
                }),
                NestCqrsDomainEventPublisher,
                { provide: DOMAIN_EVENT_PUBLISHER, useExisting: NestCqrsDomainEventPublisher },
            ]),
        );
        expect(definition.exports).toEqual(
            expect.arrayContaining([CqrsModule, NestCqrsDomainEventPublisher, DOMAIN_EVENT_PUBLISHER]),
        );
    });

    it('wires the class and DDD token to the same configured instance', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [NestCqrsDomainEventsModule.register({ mode: 'parallel', maxConcurrency: 3 })],
            providers: [CqrsConsumer],
        }).compile();

        expect(moduleRef.get(DOMAIN_EVENT_PUBLISHER)).toBe(moduleRef.get(NestCqrsDomainEventPublisher));
        expect(moduleRef.get(CqrsConsumer).commandBus).toBeInstanceOf(CommandBus);
        expect(moduleRef.get(NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS)).toEqual({
            mode: 'parallel',
            maxConcurrency: 3,
            maxBatchSize: 1000,
        });
        await moduleRef.close();
    });

    it('resolves async options through Nest dependency injection', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                NestCqrsDomainEventsModule.registerAsync({
                    imports: [ConfigFixtureModule],
                    inject: ['BATCH_MODE'],
                    useFactory: (mode: 'parallel') => ({ mode, maxConcurrency: 4 }),
                }),
            ],
        }).compile();

        expect(moduleRef.get(NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS)).toEqual({
            mode: 'parallel',
            maxConcurrency: 4,
            maxBatchSize: 1000,
        });
        await moduleRef.close();
    });

    it('supports explicit global registration and rejects invalid module options', () => {
        expect(NestCqrsDomainEventsModule.register({ isGlobal: true }).global).toBe(true);
        expect(
            NestCqrsDomainEventsModule.registerAsync({ useFactory: () => ({ mode: 'ordered' }), isGlobal: true })
                .global,
        ).toBe(true);

        expect(() => NestCqrsDomainEventsModule.register(null as never)).toThrow(CqrsDomainEventConfigurationError);
        expect(() => NestCqrsDomainEventsModule.register({ isGlobal: 'yes' as never })).toThrow('isGlobal');
        expect(() => NestCqrsDomainEventsModule.registerAsync(null as never)).toThrow('async module options');
        expect(() => NestCqrsDomainEventsModule.registerAsync({ useFactory: undefined as never })).toThrow(
            'useFactory',
        );
        expect(() =>
            NestCqrsDomainEventsModule.registerAsync({
                useFactory: () => ({ mode: 'ordered' }),
                isGlobal: 'yes' as never,
            }),
        ).toThrow('isGlobal');
    });
});
