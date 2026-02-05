import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CancelOrderCommand } from './cancel-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';
import { EVENT_BUS, IEventBus } from '@/shared/infrastructure/messaging/event-bus.interface';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(EVENT_BUS)
        private readonly eventBus: IEventBus,
    ) {}

    async execute(command: CancelOrderCommand): Promise<void> {
        const order = await this.orderRepository.findById(command.orderId);

        if (!order) {
            throw new OrderNotFoundException(command.orderId);
        }

        order.cancel();

        await this.orderRepository.save(order);

        await this.eventBus.publishAll(order.domainEvents);
        order.clearEvents();
    }
}
