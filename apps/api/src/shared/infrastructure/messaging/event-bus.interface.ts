import { DomainEvent } from '@/shared/domain/domain-event';

export interface IEventBus {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: DomainEvent[]): Promise<void>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
