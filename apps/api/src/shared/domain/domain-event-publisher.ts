import { DomainEvent } from './domain-event';

export interface IDomainEventPublisher {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');
