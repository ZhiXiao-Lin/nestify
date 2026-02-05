import { OrderItem } from './order-item.entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

describe('OrderItem Entity', () => {
    describe('create', () => {
        it('should create order item with valid properties', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10.99),
            });

            expect(orderItem.id).toBe('item-1');
            expect(orderItem.productId).toBe('product-1');
            expect(orderItem.quantity.value).toBe(2);
            expect(orderItem.unitPrice.amount).toBe(10.99);
        });
    });

    describe('getTotalPrice', () => {
        it('should calculate total price correctly', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(3),
                unitPrice: Money.create(10),
            });

            const totalPrice = orderItem.getTotalPrice();

            expect(totalPrice.amount).toBe(30);
        });

        it('should calculate total price for single item', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(1),
                unitPrice: Money.create(15.99),
            });

            const totalPrice = orderItem.getTotalPrice();

            expect(totalPrice.amount).toBe(15.99);
        });

        it('should calculate total price with decimal values', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10.99),
            });

            const totalPrice = orderItem.getTotalPrice();

            expect(totalPrice.amount).toBe(21.98);
        });
    });

    describe('updateQuantity', () => {
        it('should update quantity', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            });

            orderItem.updateQuantity(Quantity.create(5));

            expect(orderItem.quantity.value).toBe(5);
        });

        it('should affect total price after quantity update', () => {
            const orderItem = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            });

            orderItem.updateQuantity(Quantity.create(3));

            expect(orderItem.getTotalPrice().amount).toBe(30);
        });
    });

    describe('equals', () => {
        it('should return true for same id', () => {
            const item1 = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            });

            const item2 = OrderItem.create({
                id: 'item-1',
                productId: 'product-2',
                quantity: Quantity.create(3),
                unitPrice: Money.create(20),
            });

            expect(item1.equals(item2)).toBe(true);
        });

        it('should return false for different ids', () => {
            const item1 = OrderItem.create({
                id: 'item-1',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            });

            const item2 = OrderItem.create({
                id: 'item-2',
                productId: 'product-1',
                quantity: Quantity.create(2),
                unitPrice: Money.create(10),
            });

            expect(item1.equals(item2)).toBe(false);
        });
    });
});
