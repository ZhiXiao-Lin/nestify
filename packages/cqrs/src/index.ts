export {
    CqrsDomainEventConfigurationError,
    DomainEventBatchPublicationError,
    type DomainEventPublicationFailure,
} from './cqrs-domain-events.errors';
export {
    DEFAULT_DOMAIN_EVENT_BATCH_MODE,
    DEFAULT_DOMAIN_EVENT_MAX_BATCH_SIZE,
    DEFAULT_DOMAIN_EVENT_MAX_CONCURRENCY,
    NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
} from './cqrs-domain-events.options';
export type {
    DomainEventBatchMode,
    NestCqrsDomainEventPublisherOptions,
    NestCqrsDomainEventsModuleAsyncOptions,
    NestCqrsDomainEventsModuleOptions,
    ResolvedNestCqrsDomainEventPublisherOptions,
} from './cqrs-domain-events.types';
export { NestCqrsDomainEventsModule } from './nest-cqrs-domain-events.module';
export {
    createNestCqrsDomainEventPublisherProvider,
    createNestCqrsDomainEventPublisherProviders,
    NestCqrsDomainEventPublisher,
} from './nest-cqrs-domain-event-publisher';
