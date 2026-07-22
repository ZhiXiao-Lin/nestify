import { cloneValidDate, defineImmutableDateProperty } from './date-value';

export interface IDomainEvent {
    readonly occurredOn: Date;
    getAggregateId(): string;
}

export abstract class DomainEvent implements IDomainEvent {
    public declare readonly occurredOn: Date;

    constructor(occurredOn = new Date()) {
        defineImmutableDateProperty(this, 'occurredOn', cloneValidDate(occurredOn, 'occurredOn'));
    }

    abstract getAggregateId(): string;
}
