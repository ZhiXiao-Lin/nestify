import { Entity } from '@/shared/domain/entity';
import { Money } from '../value-objects/money.vo';
import { Quantity } from '../value-objects/quantity.vo';

export interface OrderItemProps {
    id: string;
    productId: string;
    quantity: Quantity;
    unitPrice: Money;
}

export class OrderItem extends Entity<string> {
    private _productId: string;
    private _quantity: Quantity;
    private _unitPrice: Money;

    get productId(): string {
        return this._productId;
    }

    get quantity(): Quantity {
        return this._quantity;
    }

    get unitPrice(): Money {
        return this._unitPrice;
    }

    private constructor(props: OrderItemProps) {
        super(props.id);
        this._productId = props.productId;
        this._quantity = props.quantity;
        this._unitPrice = props.unitPrice;
    }

    public static create(props: OrderItemProps): OrderItem {
        return new OrderItem(props);
    }

    public getTotalPrice(): Money {
        return this._unitPrice.multiply(this._quantity.value);
    }

    public updateQuantity(quantity: Quantity): void {
        this._quantity = quantity;
    }
}
