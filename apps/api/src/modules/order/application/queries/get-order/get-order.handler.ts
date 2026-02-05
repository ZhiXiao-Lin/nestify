import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrderQuery } from './get-order.query';
import { OrderResponseDto } from './order.response.dto';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import { OrderNotFoundException } from '../../../domain/exceptions/order-not-found.exception';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
    ) {}

    async execute(query: GetOrderQuery): Promise<OrderResponseDto> {
        const order = await this.orderRepository.findById(query.orderId);

        if (!order) {
            throw new OrderNotFoundException(query.orderId);
        }

        return {
            id: order.id,
            customerId: order.customerId,
            items: order.items.map(item => ({
                id: item.id,
                productId: item.productId,
                quantity: item.quantity.value,
                unitPrice: item.unitPrice.amount,
                totalPrice: item.getTotalPrice().amount,
            })),
            status: order.status.value,
            totalAmount: order.getTotalAmount().amount,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        };
    }
}
