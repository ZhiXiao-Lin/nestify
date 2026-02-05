import { OrderPricingService } from './order-pricing.service';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

describe('OrderPricingService', () => {
    let service: OrderPricingService;
    let order: Order;

    beforeEach(() => {
        service = new OrderPricingService();

        const items = [
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

        order = Order.create('customer-1', items);
    });

    describe('calculateTotal', () => {
        it('should calculate total amount for order', () => {
            const total = service.calculateTotal(order);

            expect(total.amount).toBe(40); // (2 * 10) + (1 * 20)
        });

        it('should return zero for empty order', () => {
            const emptyOrder = Order.create('customer-1', []);

            const total = service.calculateTotal(emptyOrder);

            expect(total.amount).toBe(0);
        });
    });

    describe('applyDiscount', () => {
        it('should apply discount percentage correctly', () => {
            const total = Money.create(100);

            const discounted = service.applyDiscount(total, 10);

            expect(discounted.amount).toBe(90);
        });

        it('should apply 50% discount', () => {
            const total = Money.create(100);

            const discounted = service.applyDiscount(total, 50);

            expect(discounted.amount).toBe(50);
        });

        it('should apply 100% discount', () => {
            const total = Money.create(100);

            const discounted = service.applyDiscount(total, 100);

            expect(discounted.amount).toBe(0);
        });

        it('should apply 0% discount', () => {
            const total = Money.create(100);

            const discounted = service.applyDiscount(total, 0);

            expect(discounted.amount).toBe(100);
        });

        it('should throw error for negative discount', () => {
            const total = Money.create(100);

            expect(() => service.applyDiscount(total, -10)).toThrow('Discount percent must be between 0 and 100');
        });

        it('should throw error for discount over 100%', () => {
            const total = Money.create(100);

            expect(() => service.applyDiscount(total, 101)).toThrow('Discount percent must be between 0 and 100');
        });

        it('should preserve currency after discount', () => {
            const total = Money.create(100, 'EUR');

            const discounted = service.applyDiscount(total, 10);

            expect(discounted.currency).toBe('EUR');
        });

        it('should handle decimal discount percentages', () => {
            const total = Money.create(100);

            const discounted = service.applyDiscount(total, 12.5);

            expect(discounted.amount).toBe(87.5);
        });
    });
});
