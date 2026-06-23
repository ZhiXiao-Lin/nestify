import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
    orders: OrderTable;
    order_items: OrderItemTable;
}

export interface OrderTable {
    id: Generated<string>;
    customer_id: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    total_amount: number;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string>;
}

export interface OrderItemTable {
    id: Generated<string>;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type Order = Selectable<OrderTable>;
export type NewOrder = Insertable<OrderTable>;
export type OrderUpdate = Updateable<OrderTable>;

export type OrderItem = Selectable<OrderItemTable>;
export type NewOrderItem = Insertable<OrderItemTable>;
export type OrderItemUpdate = Updateable<OrderItemTable>;
