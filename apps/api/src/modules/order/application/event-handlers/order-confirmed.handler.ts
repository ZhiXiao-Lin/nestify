import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OrderConfirmedEvent } from '../../domain/events/order-confirmed.event';

@EventsHandler(OrderConfirmedEvent)
export class OrderConfirmedHandler implements IEventHandler<OrderConfirmedEvent> {
    private readonly logger = new Logger(OrderConfirmedHandler.name);

    async handle(event: OrderConfirmedEvent) {
        this.logger.log(`Order confirmed: ${event.orderId}`);
    }
}
