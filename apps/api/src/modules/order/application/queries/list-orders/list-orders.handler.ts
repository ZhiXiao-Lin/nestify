import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListOrdersQuery } from './list-orders.query';
import { OrderListResponseDto } from './order-list.response.dto';
import { IOrderRepository, ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery> {
    constructor(
        @Inject(ORDER_REPOSITORY)
        private readonly orderRepository: IOrderRepository,
    ) {}

    async execute(query: ListOrdersQuery): Promise<OrderListResponseDto> {
        const orders = query.customerId ? await this.orderRepository.findByCustomerId(query.customerId) : [];

        return {
            orders: orders.map(order => ({
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
            })),
            total: orders.length,
        };
    }
}
