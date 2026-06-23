import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { CreateOrderCommand } from './create-order.command';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { Quantity } from '../../../domain/value-objects/quantity.vo';
import { OrderId } from '../../../domain/value-objects/order-id.vo';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
        @Inject(DOMAIN_EVENT_PUBLISHER)
        private readonly domainEventPublisher: IDomainEventPublisher,
    ) {}

    async execute(command: CreateOrderCommand): Promise<string> {
        const orderItems = command.items.map(item =>
            OrderItem.create({
                id: OrderId.create().value,
                productId: item.productId,
                quantity: Quantity.create(item.quantity),
                unitPrice: Money.create(item.unitPrice),
            }),
        );

        const order = Order.create(command.customerId, orderItems);

        await this.orderRepository.save(order);

        await this.domainEventPublisher.publishAll(order.domainEvents);
        order.clearEvents();

        return order.id;
    }
}
