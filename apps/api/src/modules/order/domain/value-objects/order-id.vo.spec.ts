import { OrderId } from './order-id.vo';

describe('OrderId Value Object', () => {
    describe('create', () => {
        it('should create order id with provided value', () => {
            const id = 'test-order-id';
            const orderId = OrderId.create(id);

            expect(orderId.value).toBe(id);
        });

        it('should generate UUID when no value provided', () => {
            const orderId = OrderId.create();

            expect(orderId.value).toBeDefined();
            expect(orderId.value.length).toBeGreaterThan(0);
            expect(orderId.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should generate different UUIDs for each call', () => {
            const orderId1 = OrderId.create();
            const orderId2 = OrderId.create();

            expect(orderId1.value).not.toBe(orderId2.value);
        });
    });

    describe('toString', () => {
        it('should return string representation', () => {
            const id = 'test-order-id';
            const orderId = OrderId.create(id);

            expect(orderId.toString()).toBe(id);
        });
    });

    describe('equals', () => {
        it('should return true for equal order ids', () => {
            const id = 'test-order-id';
            const orderId1 = OrderId.create(id);
            const orderId2 = OrderId.create(id);

            expect(orderId1.equals(orderId2)).toBe(true);
        });

        it('should return false for different order ids', () => {
            const orderId1 = OrderId.create('id-1');
            const orderId2 = OrderId.create('id-2');

            expect(orderId1.equals(orderId2)).toBe(false);
        });
    });
});
