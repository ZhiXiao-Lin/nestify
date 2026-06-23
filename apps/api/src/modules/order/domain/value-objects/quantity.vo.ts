import { ValueObject } from '@a3s-lab/ddd';

interface QuantityProps {
    value: number;
}

export class Quantity extends ValueObject<QuantityProps> {
    get value(): number {
        return this.props.value;
    }

    private constructor(props: QuantityProps) {
        super(props);
    }

    public static create(value: number): Quantity {
        if (value < 1) {
            throw new Error('Quantity must be at least 1');
        }

        if (!Number.isInteger(value)) {
            throw new Error('Quantity must be an integer');
        }

        return new Quantity({ value });
    }
}
