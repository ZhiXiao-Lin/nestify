import { Order } from '../entities/order.entity';

export interface IOrderRepository {
    findById(id: string): Promise<Order | null>;
    findByCustomerId(customerId: string): Promise<Order[]>;
    save(order: Order): Promise<Order>;
    delete(id: string): Promise<void>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
