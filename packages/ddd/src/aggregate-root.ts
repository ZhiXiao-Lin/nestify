import { DomainEvent } from './domain-event';
import { Entity } from './entity';

export abstract class AggregateRoot<T = string> extends Entity<T> {
    private readonly _domainEvents: DomainEvent[] = [];

    get domainEvents(): readonly DomainEvent[] {
        return Object.freeze([...this._domainEvents]);
    }

    addDomainEvent(domainEvent: DomainEvent): void {
        if (!(domainEvent instanceof DomainEvent)) {
            throw new TypeError('domainEvent must extend DomainEvent.');
        }
        this._domainEvents.push(domainEvent);
    }

    clearEvents(): void {
        this._domainEvents.length = 0;
    }
}
