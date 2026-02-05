import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
    private readonly logger = new Logger(OrderCreatedHandler.name);

    async handle(event: OrderCreatedEvent) {
        this.logger.log(
            `Order created: ${event.orderId} for customer ${event.customerId} with total ${event.totalAmount.amount}`,
        );
    }
}
