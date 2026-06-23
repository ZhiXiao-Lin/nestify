import { ValueObject } from '@a3s-lab/ddd';

export enum OrderStatusEnum {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
}

interface OrderStatusProps {
    value: OrderStatusEnum;
}

export class OrderStatus extends ValueObject<OrderStatusProps> {
    get value(): OrderStatusEnum {
        return this.props.value;
    }

    private constructor(props: OrderStatusProps) {
        super(props);
    }

    public static create(status: OrderStatusEnum): OrderStatus {
        return new OrderStatus({ value: status });
    }

    public static pending(): OrderStatus {
        return new OrderStatus({ value: OrderStatusEnum.PENDING });
    }

    public static confirmed(): OrderStatus {
        return new OrderStatus({ value: OrderStatusEnum.CONFIRMED });
    }

    public static cancelled(): OrderStatus {
        return new OrderStatus({ value: OrderStatusEnum.CANCELLED });
    }

    public static completed(): OrderStatus {
        return new OrderStatus({ value: OrderStatusEnum.COMPLETED });
    }

    public isPending(): boolean {
        return this.value === OrderStatusEnum.PENDING;
    }

    public isConfirmed(): boolean {
        return this.value === OrderStatusEnum.CONFIRMED;
    }

    public isCancelled(): boolean {
        return this.value === OrderStatusEnum.CANCELLED;
    }

    public isCompleted(): boolean {
        return this.value === OrderStatusEnum.COMPLETED;
    }
}
