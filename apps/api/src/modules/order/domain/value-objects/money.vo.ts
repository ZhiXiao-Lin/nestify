import { ValueObject } from '@/shared/domain/value-object';
import { Guard } from '@/shared/utils/guard';

interface MoneyProps {
    amount: number;
    currency: string;
}

export class Money extends ValueObject<MoneyProps> {
    get amount(): number {
        return this.props.amount;
    }

    get currency(): string {
        return this.props.currency;
    }

    private constructor(props: MoneyProps) {
        super(props);
    }

    public static create(amount: number, currency: string = 'USD'): Money {
        const guardResult = Guard.againstNullOrUndefined(amount, 'amount');
        if (!guardResult.succeeded) {
            throw new Error(guardResult.message);
        }

        if (amount < 0) {
            throw new Error('Money amount cannot be negative');
        }

        return new Money({ amount, currency });
    }

    public add(money: Money): Money {
        if (this.currency !== money.currency) {
            throw new Error('Cannot add money with different currencies');
        }
        return Money.create(this.amount + money.amount, this.currency);
    }

    public multiply(multiplier: number): Money {
        return Money.create(this.amount * multiplier, this.currency);
    }
}
