import { OrderStatus, OrderStatusEnum } from './order-status.vo';

describe('OrderStatus Value Object', () => {
    describe('create', () => {
        it('should create order status with valid enum value', () => {
            const status = OrderStatus.create(OrderStatusEnum.PENDING);

            expect(status.value).toBe(OrderStatusEnum.PENDING);
        });
    });

    describe('factory methods', () => {
        it('should create pending status', () => {
            const status = OrderStatus.pending();

            expect(status.value).toBe(OrderStatusEnum.PENDING);
            expect(status.isPending()).toBe(true);
        });

        it('should create confirmed status', () => {
            const status = OrderStatus.confirmed();

            expect(status.value).toBe(OrderStatusEnum.CONFIRMED);
            expect(status.isConfirmed()).toBe(true);
        });

        it('should create cancelled status', () => {
            const status = OrderStatus.cancelled();

            expect(status.value).toBe(OrderStatusEnum.CANCELLED);
            expect(status.isCancelled()).toBe(true);
        });

        it('should create completed status', () => {
            const status = OrderStatus.completed();

            expect(status.value).toBe(OrderStatusEnum.COMPLETED);
            expect(status.isCompleted()).toBe(true);
        });
    });

    describe('status checks', () => {
        it('isPending should return false for non-pending status', () => {
            const status = OrderStatus.confirmed();

            expect(status.isPending()).toBe(false);
        });

        it('isConfirmed should return false for non-confirmed status', () => {
            const status = OrderStatus.pending();

            expect(status.isConfirmed()).toBe(false);
        });

        it('isCancelled should return false for non-cancelled status', () => {
            const status = OrderStatus.pending();

            expect(status.isCancelled()).toBe(false);
        });

        it('isCompleted should return false for non-completed status', () => {
            const status = OrderStatus.pending();

            expect(status.isCompleted()).toBe(false);
        });
    });

    describe('equals', () => {
        it('should return true for equal statuses', () => {
            const status1 = OrderStatus.pending();
            const status2 = OrderStatus.pending();

            expect(status1.equals(status2)).toBe(true);
        });

        it('should return false for different statuses', () => {
            const status1 = OrderStatus.pending();
            const status2 = OrderStatus.confirmed();

            expect(status1.equals(status2)).toBe(false);
        });
    });
});
