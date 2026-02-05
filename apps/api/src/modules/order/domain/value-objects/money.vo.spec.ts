import { Money } from './money.vo';

describe('Money Value Object', () => {
    describe('create', () => {
        it('should create money with valid amount', () => {
            const money = Money.create(10.99, 'USD');

            expect(money.amount).toBe(10.99);
            expect(money.currency).toBe('USD');
        });

        it('should create money with default currency', () => {
            const money = Money.create(10.99);

            expect(money.amount).toBe(10.99);
            expect(money.currency).toBe('USD');
        });

        it('should throw error for negative amount', () => {
            expect(() => Money.create(-10)).toThrow('Money amount cannot be negative');
        });

        it('should allow zero amount', () => {
            const money = Money.create(0);

            expect(money.amount).toBe(0);
        });
    });

    describe('add', () => {
        it('should add money with same currency', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(5, 'USD');

            const result = money1.add(money2);

            expect(result.amount).toBe(15);
            expect(result.currency).toBe('USD');
        });

        it('should throw error when adding different currencies', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(5, 'EUR');

            expect(() => money1.add(money2)).toThrow('Cannot add money with different currencies');
        });

        it('should not mutate original money objects', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(5, 'USD');

            money1.add(money2);

            expect(money1.amount).toBe(10);
            expect(money2.amount).toBe(5);
        });
    });

    describe('multiply', () => {
        it('should multiply money by positive number', () => {
            const money = Money.create(10, 'USD');

            const result = money.multiply(2);

            expect(result.amount).toBe(20);
            expect(result.currency).toBe('USD');
        });

        it('should multiply money by decimal', () => {
            const money = Money.create(10, 'USD');

            const result = money.multiply(1.5);

            expect(result.amount).toBe(15);
        });

        it('should multiply money by zero', () => {
            const money = Money.create(10, 'USD');

            const result = money.multiply(0);

            expect(result.amount).toBe(0);
        });

        it('should not mutate original money object', () => {
            const money = Money.create(10, 'USD');

            money.multiply(2);

            expect(money.amount).toBe(10);
        });
    });

    describe('equals', () => {
        it('should return true for equal money objects', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(10, 'USD');

            expect(money1.equals(money2)).toBe(true);
        });

        it('should return false for different amounts', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(20, 'USD');

            expect(money1.equals(money2)).toBe(false);
        });

        it('should return false for different currencies', () => {
            const money1 = Money.create(10, 'USD');
            const money2 = Money.create(10, 'EUR');

            expect(money1.equals(money2)).toBe(false);
        });

        it('should return false for null', () => {
            const money = Money.create(10, 'USD');

            expect(money.equals(null as any)).toBe(false);
        });

        it('should return false for undefined', () => {
            const money = Money.create(10, 'USD');

            expect(money.equals(undefined as any)).toBe(false);
        });
    });
});
