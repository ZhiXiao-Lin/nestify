import { DomainEvent } from '@a3s-lab/ddd';
import { Money } from '../value-objects/money.vo';

export class OrderCreatedEvent extends DomainEvent {
    constructor(
        public readonly orderId: string,
        public readonly customerId: string,
        public readonly totalAmount: Money,
    ) {
        super();
    }

    getAggregateId(): string {
        return this.orderId;
    }
}
