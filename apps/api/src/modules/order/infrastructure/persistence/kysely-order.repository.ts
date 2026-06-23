import { Injectable } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { Database, NewOrder, NewOrderItem } from '@/shared/database/database.types';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/entities/order-item.entity';
import { OrderId } from '../../domain/value-objects/order-id.vo';
import { OrderStatus, OrderStatusEnum } from '../../domain/value-objects/order-status.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { Quantity } from '../../domain/value-objects/quantity.vo';

@Injectable()
export class OrderRepository implements IOrderRepository {
    constructor(private readonly db: KyselyService<Database>) {}

    async findById(id: string): Promise<Order | null> {
        const orderRow = await this.db.selectFrom('orders').where('id', '=', id).selectAll().executeTakeFirst();

        if (!orderRow) {
            return null;
        }

        const itemRows = await this.db.selectFrom('order_items').where('order_id', '=', id).selectAll().execute();

        return this.toDomain(orderRow, itemRows);
    }

    async findByCustomerId(customerId: string): Promise<Order[]> {
        const orderRows = await this.db
            .selectFrom('orders')
            .where('customer_id', '=', customerId)
            .selectAll()
            .execute();

        const orders: Order[] = [];

        for (const orderRow of orderRows) {
            const itemRows = await this.db
                .selectFrom('order_items')
                .where('order_id', '=', orderRow.id)
                .selectAll()
                .execute();

            orders.push(this.toDomain(orderRow, itemRows));
        }

        return orders;
    }

    async save(order: Order): Promise<Order> {
        return await this.db.transaction().execute(async trx => {
            // Check if order exists
            const existingOrder = await trx
                .selectFrom('orders')
                .where('id', '=', order.id)
                .select('id')
                .executeTakeFirst();

            const statusValue = this.mapStatusToDb(order.status.value);

            const orderData: NewOrder = {
                id: order.id,
                customer_id: order.customerId,
                status: statusValue,
                total_amount: order.getTotalAmount().amount,
                created_at: order.createdAt.toISOString(),
                updated_at: order.updatedAt.toISOString(),
            };

            if (existingOrder) {
                // Update existing order
                await trx
                    .updateTable('orders')
                    .set({
                        status: orderData.status,
                        total_amount: orderData.total_amount,
                        updated_at: orderData.updated_at,
                    })
                    .where('id', '=', order.id)
                    .execute();

                // Delete existing items
                await trx.deleteFrom('order_items').where('order_id', '=', order.id).execute();
            } else {
                // Insert new order
                await trx.insertInto('orders').values(orderData).execute();
            }

            // Insert order items
            if (order.items.length > 0) {
                const itemsData: NewOrderItem[] = order.items.map(item => ({
                    id: item.id,
                    order_id: order.id,
                    product_id: item.productId,
                    quantity: item.quantity.value,
                    unit_price: item.unitPrice.amount,
                    subtotal: item.getTotalPrice().amount,
                    created_at: new Date().toISOString(),
                }));

                await trx.insertInto('order_items').values(itemsData).execute();
            }

            return order;
        });
    }

    async delete(id: string): Promise<void> {
        await this.db.transaction().execute(async trx => {
            await trx.deleteFrom('order_items').where('order_id', '=', id).execute();

            await trx.deleteFrom('orders').where('id', '=', id).execute();
        });
    }

    private mapStatusToDb(status: OrderStatusEnum): 'pending' | 'confirmed' | 'cancelled' {
        switch (status) {
            case OrderStatusEnum.PENDING:
                return 'pending';
            case OrderStatusEnum.CONFIRMED:
                return 'confirmed';
            case OrderStatusEnum.CANCELLED:
                return 'cancelled';
            default:
                return 'pending';
        }
    }

    private mapStatusFromDb(status: string): OrderStatusEnum {
        switch (status.toLowerCase()) {
            case 'pending':
                return OrderStatusEnum.PENDING;
            case 'confirmed':
                return OrderStatusEnum.CONFIRMED;
            case 'cancelled':
                return OrderStatusEnum.CANCELLED;
            default:
                return OrderStatusEnum.PENDING;
        }
    }

    private toDomain(
        orderRow: {
            id: string;
            customer_id: string;
            status: string;
            total_amount: number;
            created_at: Date;
            updated_at: Date;
        },
        itemRows: Array<{
            id: string;
            order_id: string;
            product_id: string;
            quantity: number;
            unit_price: number;
            subtotal: number;
            created_at: Date;
        }>,
    ): Order {
        const items = itemRows.map(itemRow =>
            OrderItem.create({
                id: itemRow.id,
                productId: itemRow.product_id,
                quantity: Quantity.create(itemRow.quantity),
                unitPrice: Money.create(itemRow.unit_price),
            }),
        );

        return Order.reconstitute({
            id: OrderId.create(orderRow.id),
            customerId: orderRow.customer_id,
            items,
            status: OrderStatus.create(this.mapStatusFromDb(orderRow.status)),
            createdAt: orderRow.created_at,
            updatedAt: orderRow.updated_at,
        });
    }
}
