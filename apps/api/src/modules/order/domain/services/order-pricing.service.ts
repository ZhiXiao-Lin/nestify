import { Injectable } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { Money } from '../value-objects/money.vo';

@Injectable()
export class OrderPricingService {
    calculateTotal(order: Order): Money {
        return order.getTotalAmount();
    }

    applyDiscount(total: Money, discountPercent: number): Money {
        if (discountPercent < 0 || discountPercent > 100) {
            throw new Error('Discount percent must be between 0 and 100');
        }

        const discountMultiplier = 1 - discountPercent / 100;
        return Money.create(total.amount * discountMultiplier, total.currency);
    }
}
