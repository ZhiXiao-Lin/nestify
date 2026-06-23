import { DomainEvent } from './domain-event';
import { Entity } from './entity';

export abstract class AggregateRoot<T = string> extends Entity<T> {
    private _domainEvents: DomainEvent[] = [];

    get domainEvents(): DomainEvent[] {
        return this._domainEvents;
    }

    addDomainEvent(domainEvent: DomainEvent): void {
        this._domainEvents.push(domainEvent);
    }

    clearEvents(): void {
        this._domainEvents = [];
    }
}
