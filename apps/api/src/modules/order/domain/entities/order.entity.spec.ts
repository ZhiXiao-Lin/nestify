import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';
import { OrderId } from '../value-objects/order-id.vo';
import { OrderStatus } from '../value-objects/order-status.vo';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderConfirmedEvent } from '../events/order-confirmed.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { InvalidOrderStateException } from '../exceptions/invalid-order-state.exception';

describe('Order Aggregate Root', () => {
    let orderItems: OrderItem[];

    beforeEach(() => {
        orderItems = [
            OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            }),
            OrderItem.create({
                id: 'item-2',
                productId: 'product-2',
                quantity: Quantity.create(1),
                unitPrice: Money.create(20),
            }),
        ];
    });

    describe('create', () => {
        it('should create order with valid properties', () => {
            const order = Order.create('customer-1', orderItems);

            expect(order.id).toBeDefined();
            expect(order.customerId).toBe('customer-1');
            expect(order.items.length).toBe(2);
            expect(order.status.isPending()).toBe(true);
            expect(order.createdAt).toBeInstanceOf(Date);
            expect(order.updatedAt).toBeInstanceOf(Date);
        });

        it('should create order with provided id', () => {
            const orderId = OrderId.create('custom-order-id');
            const order = Order.create('customer-1', orderItems, orderId);

            expect(order.id).toBe('custom-order-id');
        });

        it('should raise OrderCreatedEvent', () => {
            const order = Order.create('customer-1', orderItems);

            expect(order.domainEvents.length).toBe(1);
            expect(order.domainEvents[0]).toBeInstanceOf(OrderCreatedEvent);
            expect((order.domainEvents[0] as OrderCreatedEvent).orderId).toBe(order.id);
            expect((order.domainEvents[0] as OrderCreatedEvent).customerId).toBe('customer-1');
        });

        it('should create order with empty items', () => {
            const order = Order.create('customer-1', []);

            expect(order.items.length).toBe(0);
        });
    });

    describe('getTotalAmount', () => {
        it('should calculate total amount correctly', () => {
            const order = Order.create('customer-1', orderItems);

            const total = order.getTotalAmount();

            expect(total.amount).toBe(40); // (2 * 10) + (1 * 20)
        });

        it('should return zero for empty order', () => {
            const order = Order.create('customer-1', []);

            const total = order.getTotalAmount();

            expect(total.amount).toBe(0);
        });

        it('should calculate total for single item', () => {
            const singleItem = [
                OrderItem.create({
                    id: 'item-1',
                    productId: 'product-1',
                    quantity: Quantity.create(3),
                    unitPrice: Money.create(15),
                }),
            ];

            const order = Order.create('customer-1', singleItem);

            expect(order.getTotalAmount().amount).toBe(45);
        });
    });

    describe('confirm', () => {
        it('should confirm pending order', () => {
            const order = Order.create('customer-1', orderItems);

            order.confirm();

            expect(order.status.isConfirmed()).toBe(true);
        });

        it('should raise OrderConfirmedEvent', () => {
            const order = Order.create('customer-1', orderItems);
            order.clearEvents(); // Clear creation event

            order.confirm();

            expect(order.domainEvents.length).toBe(1);
            expect(order.domainEvents[0]).toBeInstanceOf(OrderConfirmedEvent);
            expect((order.domainEvents[0] as OrderConfirmedEvent).orderId).toBe(order.id);
        });

        it('should update updatedAt timestamp', () => {
            const order = Order.create('customer-1', orderItems);
            const originalUpdatedAt = order.updatedAt;

            // Wait a bit to ensure timestamp difference
            setTimeout(() => {
                order.confirm();
                expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
            }, 10);
        });

        it('should throw error when confirming non-pending order', () => {
            const order = Order.create('customer-1', orderItems);
            order.confirm();

            expect(() => order.confirm()).toThrow(InvalidOrderStateException);
            expect(() => order.confirm()).toThrow('Cannot confirm order');
        });

        it('should throw error when confirming cancelled order', () => {
            const order = Order.create('customer-1', orderItems);
            order.cancel();

            expect(() => order.confirm()).toThrow(InvalidOrderStateException);
        });
    });

    describe('cancel', () => {
        it('should cancel pending order', () => {
            const order = Order.create('customer-1', orderItems);

            order.cancel();

            expect(order.status.isCancelled()).toBe(true);
        });

        it('should cancel confirmed order', () => {
            const order = Order.create('customer-1', orderItems);
            order.confirm();

            order.cancel();

            expect(order.status.isCancelled()).toBe(true);
        });

        it('should raise OrderCancelledEvent', () => {
            const order = Order.create('customer-1', orderItems);
            order.clearEvents();

            order.cancel();

            expect(order.domainEvents.length).toBe(1);
            expect(order.domainEvents[0]).toBeInstanceOf(OrderCancelledEvent);
        });

        it('should throw error when cancelling already cancelled order', () => {
            const order = Order.create('customer-1', orderItems);
            order.cancel();

            expect(() => order.cancel()).toThrow(InvalidOrderStateException);
            expect(() => order.cancel()).toThrow('Cannot cancel order');
        });
    });

    describe('addItem', () => {
        it('should add item to pending order', () => {
            const order = Order.create('customer-1', orderItems);
            const newItem = OrderItem.create({
                id: 'item-3',
                productId: 'product-3',
                quantity: Quantity.create(1),
                unitPrice: Money.create(30),
            });

            order.addItem(newItem);

            expect(order.items.length).toBe(3);
            expect(order.items[2].id).toBe('item-3');
        });

        it('should update total amount after adding item', () => {
            const order = Order.create('customer-1', orderItems);
            const newItem = OrderItem.create({
                id: 'item-3',
                productId: 'product-3',
                quantity: Quantity.create(1),
                unitPrice: Money.create(30),
            });

            order.addItem(newItem);

            expect(order.getTotalAmount().amount).toBe(70); // 40 + 30
        });

        it('should throw error when adding item to non-pending order', () => {
            const order = Order.create('customer-1', orderItems);
            order.confirm();

            const newItem = OrderItem.create({
                id: 'item-3',
                productId: 'product-3',
                quantity: Quantity.create(1),
                unitPrice: Money.create(30),
            });

            expect(() => order.addItem(newItem)).toThrow(InvalidOrderStateException);
            expect(() => order.addItem(newItem)).toThrow('Cannot add items to a non-pending order');
        });
    });

    describe('removeItem', () => {
        it('should remove item from pending order', () => {
            const order = Order.create('customer-1', orderItems);

            order.removeItem('item-1');

            expect(order.items.length).toBe(1);
            expect(order.items[0].id).toBe('item-2');
        });

        it('should update total amount after removing item', () => {
            const order = Order.create('customer-1', orderItems);

            order.removeItem('item-1'); // Remove item worth 20

            expect(order.getTotalAmount().amount).toBe(20);
        });

        it('should throw error when removing item from non-pending order', () => {
            const order = Order.create('customer-1', orderItems);
            order.confirm();

            expect(() => order.removeItem('item-1')).toThrow(InvalidOrderStateException);
            expect(() => order.removeItem('item-1')).toThrow('Cannot remove items from a non-pending order');
        });

        it('should handle removing non-existent item', () => {
            const order = Order.create('customer-1', orderItems);

            order.removeItem('non-existent-id');

            expect(order.items.length).toBe(2); // No change
        });
    });

    describe('clearEvents', () => {
        it('should clear all domain events', () => {
            const order = Order.create('customer-1', orderItems);

            expect(order.domainEvents.length).toBeGreaterThan(0);

            order.clearEvents();

            expect(order.domainEvents.length).toBe(0);
        });
    });

    describe('reconstitute', () => {
        it('should reconstitute order from props without raising events', () => {
            const orderId = OrderId.create('existing-order-id');
            const order = Order.reconstitute({
                id: orderId,
                customerId: 'customer-1',
                items: orderItems,
                status: OrderStatus.confirmed(),
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
            });

            expect(order.id).toBe('existing-order-id');
            expect(order.status.isConfirmed()).toBe(true);
            expect(order.domainEvents.length).toBe(0); // No events raised
        });
    });

    describe('items immutability', () => {
        it('should return copy of items array', () => {
            const order = Order.create('customer-1', orderItems);

            const items1 = order.items;
            const items2 = order.items;

            expect(items1).not.toBe(items2); // Different array instances
            expect(items1).toEqual(items2); // Same content
        });

        it('should not allow external modification of items', () => {
            const order = Order.create('customer-1', orderItems);

            const items = order.items;
            items.push(
                OrderItem.create({
                    id: 'item-3',
                    productId: 'product-3',
                    quantity: Quantity.create(1),
                    unitPrice: Money.create(30),
                }),
            );

            expect(order.items.length).toBe(2); // Original unchanged
        });
    });
});
