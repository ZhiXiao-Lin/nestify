import { DomainEvent } from '@/shared/domain/domain-event';

export class OrderCancelledEvent extends DomainEvent {
    constructor(public readonly orderId: string) {
        super();
    }

    getAggregateId(): string {
        return this.orderId;
    }
}
