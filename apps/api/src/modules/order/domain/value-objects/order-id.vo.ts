import { ValueObject } from '@/shared/domain/value-object';
import { v4 as uuidv4 } from 'uuid';

interface OrderIdProps {
    value: string;
}

export class OrderId extends ValueObject<OrderIdProps> {
    get value(): string {
        return this.props.value;
    }

    private constructor(props: OrderIdProps) {
        super(props);
    }

    public static create(id?: string): OrderId {
        return new OrderId({ value: id || uuidv4() });
    }

    public toString(): string {
        return this.value;
    }
}
