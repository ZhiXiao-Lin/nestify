import { DomainEvent } from '@a3s-lab/ddd';

export class OrderConfirmedEvent extends DomainEvent {
    constructor(public readonly orderId: string) {
        super();
    }

    getAggregateId(): string {
        return this.orderId;
    }
}
