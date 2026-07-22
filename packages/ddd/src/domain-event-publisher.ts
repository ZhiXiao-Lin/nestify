import type { DomainEvent } from './domain-event';

export interface IDomainEventPublisher {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: readonly DomainEvent[]): Promise<void>;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol.for('@a3s-lab/ddd/domain-event-publisher');
