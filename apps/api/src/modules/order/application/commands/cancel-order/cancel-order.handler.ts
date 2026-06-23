import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { CancelOrderCommand } from './cancel-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(DOMAIN_EVENT_PUBLISHER)
        private readonly domainEventPublisher: IDomainEventPublisher,
    ) {}

    async execute(command: CancelOrderCommand): Promise<void> {
        const order = await this.orderRepository.findById(command.orderId);

        if (!order) {
            throw new OrderNotFoundException(command.orderId);
        }

        order.cancel();

        await this.orderRepository.save(order);

        await this.domainEventPublisher.publishAll(order.domainEvents);
        order.clearEvents();
    }
}
