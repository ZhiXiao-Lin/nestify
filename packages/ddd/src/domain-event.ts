export interface IDomainEvent {
    occurredOn: Date;
    getAggregateId(): string;
}

export abstract class DomainEvent implements IDomainEvent {
    public readonly occurredOn: Date;

    constructor() {
        this.occurredOn = new Date();
    }

    abstract getAggregateId(): string;
}
