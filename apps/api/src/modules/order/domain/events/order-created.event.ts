import { DomainEvent } from '@/shared/domain/domain-event';
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
