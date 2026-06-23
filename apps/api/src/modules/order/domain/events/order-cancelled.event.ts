import { DomainEvent } from '@a3s-lab/ddd';

export class OrderCancelledEvent extends DomainEvent {
    constructor(public readonly orderId: string) {
        super();
    }

    getAggregateId(): string {
        return this.orderId;
    }
}
