import { AggregateRoot } from '@/shared/domain/aggregate-root';
import { OrderId } from '../value-objects/order-id.vo';
import { OrderStatus } from '../value-objects/order-status.vo';
import { Money } from '../value-objects/money.vo';
import { OrderItem } from './order-item.entity';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderConfirmedEvent } from '../events/order-confirmed.event';
import { OrderCancelledEvent } from '../events/order-cancelled.event';
import { InvalidOrderStateException } from '../exceptions/invalid-order-state.exception';

export interface OrderProps {
    id: OrderId;
    customerId: string;
    items: OrderItem[];
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
}

export class Order extends AggregateRoot<string> {
    private _customerId: string;
    private _items: OrderItem[];
    private _status: OrderStatus;
    private _createdAt: Date;
    private _updatedAt: Date;

    get customerId(): string {
        return this._customerId;
    }

    get items(): OrderItem[] {
        return [...this._items];
    }

    get status(): OrderStatus {
        return this._status;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    private constructor(props: OrderProps) {
        super(props.id.value);
        this._customerId = props.customerId;
        this._items = props.items;
        this._status = props.status;
        this._createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;
    }

    public static create(customerId: string, items: OrderItem[], id?: OrderId): Order {
        const orderId = id || OrderId.create();
        const now = new Date();

        const order = new Order({
            id: orderId,
            customerId,
            items,
            status: OrderStatus.pending(),
            createdAt: now,
            updatedAt: now,
        });

        order.addDomainEvent(new OrderCreatedEvent(orderId.value, customerId, order.getTotalAmount()));

        return order;
    }

    public static reconstitute(props: OrderProps): Order {
        return new Order(props);
    }

    public getTotalAmount(): Money {
        if (this._items.length === 0) {
            return Money.create(0);
        }

        return this._items.reduce((total, item) => total.add(item.getTotalPrice()), Money.create(0));
    }

    public confirm(): void {
        if (!this._status.isPending()) {
            throw new InvalidOrderStateException(`Cannot confirm order. Current status: ${this._status.value}`);
        }

        this._status = OrderStatus.confirmed();
        this._updatedAt = new Date();

        this.addDomainEvent(new OrderConfirmedEvent(this.id));
    }

    public cancel(): void {
        if (this._status.isCancelled() || this._status.isCompleted()) {
            throw new InvalidOrderStateException(`Cannot cancel order. Current status: ${this._status.value}`);
        }

        this._status = OrderStatus.cancelled();
        this._updatedAt = new Date();

        this.addDomainEvent(new OrderCancelledEvent(this.id));
    }

    public addItem(item: OrderItem): void {
        if (!this._status.isPending()) {
            throw new InvalidOrderStateException('Cannot add items to a non-pending order');
        }

        this._items.push(item);
        this._updatedAt = new Date();
    }

    public removeItem(itemId: string): void {
        if (!this._status.isPending()) {
            throw new InvalidOrderStateException('Cannot remove items from a non-pending order');
        }

        this._items = this._items.filter(item => item.id !== itemId);
        this._updatedAt = new Date();
    }
}
