import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { ConfirmOrderCommand } from './confirm-order.command';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';

@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderHandler implements ICommandHandler<ConfirmOrderCommand> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(DOMAIN_EVENT_PUBLISHER)
        private readonly domainEventPublisher: IDomainEventPublisher,
    ) {}

    async execute(command: ConfirmOrderCommand): Promise<void> {
        const order = await this.orderRepository.findById(command.orderId);

        if (!order) {
            throw new OrderNotFoundException(command.orderId);
        }

        order.confirm();

        await this.orderRepository.save(order);

        await this.domainEventPublisher.publishAll(order.domainEvents);
        order.clearEvents();
    }
}
