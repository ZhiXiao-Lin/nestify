import { DOMAIN_EVENT_PUBLISHER } from '@a3s-lab/ddd';
import { type DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CqrsDomainEventConfigurationError } from './cqrs-domain-events.errors';
import {
    NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
    normalizeNestCqrsDomainEventPublisherOptions,
} from './cqrs-domain-events.options';
import type {
    NestCqrsDomainEventsModuleAsyncOptions,
    NestCqrsDomainEventsModuleOptions,
} from './cqrs-domain-events.types';
import { NestCqrsDomainEventPublisher } from './nest-cqrs-domain-event-publisher';

@Module({})
export class NestCqrsDomainEventsModule {
    static register(options: NestCqrsDomainEventsModuleOptions = {}): DynamicModule {
        if (typeof options !== 'object' || options === null || Array.isArray(options)) {
            throw new CqrsDomainEventConfigurationError('CQRS domain-events module options must be an object');
        }
        if (options.isGlobal !== undefined && typeof options.isGlobal !== 'boolean') {
            throw new CqrsDomainEventConfigurationError('isGlobal must be a boolean');
        }

        const publisherOptions = normalizeNestCqrsDomainEventPublisherOptions(options);
        return {
            module: NestCqrsDomainEventsModule,
            global: options.isGlobal ?? false,
            imports: [CqrsModule],
            providers: [
                { provide: NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS, useValue: publisherOptions },
                NestCqrsDomainEventPublisher,
                { provide: DOMAIN_EVENT_PUBLISHER, useExisting: NestCqrsDomainEventPublisher },
            ],
            exports: [CqrsModule, NestCqrsDomainEventPublisher, DOMAIN_EVENT_PUBLISHER],
        };
    }

    static registerAsync(options: NestCqrsDomainEventsModuleAsyncOptions): DynamicModule {
        if (typeof options !== 'object' || options === null || Array.isArray(options)) {
            throw new CqrsDomainEventConfigurationError('CQRS domain-events async module options must be an object');
        }
        if (typeof options.useFactory !== 'function') {
            throw new CqrsDomainEventConfigurationError('registerAsync requires a useFactory function');
        }
        if (options.isGlobal !== undefined && typeof options.isGlobal !== 'boolean') {
            throw new CqrsDomainEventConfigurationError('isGlobal must be a boolean');
        }

        const optionsFactory = options.useFactory;
        return {
            module: NestCqrsDomainEventsModule,
            global: options.isGlobal ?? false,
            imports: [CqrsModule, ...(options.imports ?? [])],
            providers: [
                {
                    provide: NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: unknown[]) =>
                        normalizeNestCqrsDomainEventPublisherOptions(await optionsFactory(...args)),
                },
                NestCqrsDomainEventPublisher,
                { provide: DOMAIN_EVENT_PUBLISHER, useExisting: NestCqrsDomainEventPublisher },
            ],
            exports: [CqrsModule, NestCqrsDomainEventPublisher, DOMAIN_EVENT_PUBLISHER],
        };
    }
}
