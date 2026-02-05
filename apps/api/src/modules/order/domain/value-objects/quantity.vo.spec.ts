import { Quantity } from './quantity.vo';

describe('Quantity Value Object', () => {
    describe('create', () => {
        it('should create quantity with valid value', () => {
            const quantity = Quantity.create(5);

            expect(quantity.value).toBe(5);
        });

        it('should throw error for zero quantity', () => {
            expect(() => Quantity.create(0)).toThrow('Quantity must be at least 1');
        });

        it('should throw error for negative quantity', () => {
            expect(() => Quantity.create(-5)).toThrow('Quantity must be at least 1');
        });

        it('should throw error for non-integer quantity', () => {
            expect(() => Quantity.create(5.5)).toThrow('Quantity must be an integer');
        });

        it('should allow large quantities', () => {
            const quantity = Quantity.create(1000);

            expect(quantity.value).toBe(1000);
        });
    });

    describe('equals', () => {
        it('should return true for equal quantities', () => {
            const quantity1 = Quantity.create(5);
            const quantity2 = Quantity.create(5);

            expect(quantity1.equals(quantity2)).toBe(true);
        });

        it('should return false for different quantities', () => {
            const quantity1 = Quantity.create(5);
            const quantity2 = Quantity.create(10);

            expect(quantity1.equals(quantity2)).toBe(false);
        });

        it('should return false for null', () => {
            const quantity = Quantity.create(5);

            expect(quantity.equals(null as any)).toBe(false);
        });
    });
});
