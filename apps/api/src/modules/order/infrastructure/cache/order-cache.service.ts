import { Injectable, Logger } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';
import { Order } from '../../domain/entities/order.entity';

const ORDER_CACHE_PREFIX = 'order:';
const ORDER_LIST_CACHE_PREFIX = 'orders:customer:';
const DEFAULT_TTL = 3600; // 1 hour

@Injectable()
export class OrderCacheService {
    private readonly logger = new Logger(OrderCacheService.name);

    constructor(private readonly redisson: RedissonService) {}

    /**
     * Cache an order by ID
     */
    async cacheOrder(order: Order, ttl: number = DEFAULT_TTL): Promise<void> {
        const key = `${ORDER_CACHE_PREFIX}${order.id}`;
        const data = this.serializeOrder(order);
        await this.redisson.setJSON(key, data, ttl);
        this.logger.debug(`Cached order: ${order.id}`);
    }

    /**
     * Get cached order by ID
     */
    async getCachedOrder(orderId: string): Promise<SerializedOrder | null> {
        const key = `${ORDER_CACHE_PREFIX}${orderId}`;
        return this.redisson.getJSON<SerializedOrder>(key);
    }

    /**
     * Invalidate order cache
     */
    async invalidateOrder(orderId: string): Promise<void> {
        const key = `${ORDER_CACHE_PREFIX}${orderId}`;
        await this.redisson.delete(key);
        this.logger.debug(`Invalidated order cache: ${orderId}`);
    }

    /**
     * Cache order list for a customer
     */
    async cacheCustomerOrders(customerId: string, orders: Order[], ttl: number = DEFAULT_TTL): Promise<void> {
        const key = `${ORDER_LIST_CACHE_PREFIX}${customerId}`;
        const data = orders.map(order => this.serializeOrder(order));
        await this.redisson.setJSON(key, data, ttl);
        this.logger.debug(`Cached ${orders.length} orders for customer: ${customerId}`);
    }

    /**
     * Get cached orders for a customer
     */
    async getCachedCustomerOrders(customerId: string): Promise<SerializedOrder[] | null> {
        const key = `${ORDER_LIST_CACHE_PREFIX}${customerId}`;
        return this.redisson.getJSON<SerializedOrder[]>(key);
    }

    /**
     * Invalidate customer orders cache
     */
    async invalidateCustomerOrders(customerId: string): Promise<void> {
        const key = `${ORDER_LIST_CACHE_PREFIX}${customerId}`;
        await this.redisson.delete(key);
        this.logger.debug(`Invalidated customer orders cache: ${customerId}`);
    }

    /**
     * Get or set order with cache
     */
    async getOrSetOrder(
        orderId: string,
        factory: () => Promise<Order | null>,
        ttl: number = DEFAULT_TTL,
    ): Promise<SerializedOrder | null> {
        const key = `${ORDER_CACHE_PREFIX}${orderId}`;

        return this.redisson.getOrSet<SerializedOrder | null>(
            key,
            async () => {
                const order = await factory();
                return order ? this.serializeOrder(order) : null;
            },
            ttl,
        );
    }

    /**
     * Execute operation with distributed lock
     * Prevents race conditions when updating orders
     */
    async withOrderLock<T>(
        orderId: string,
        operation: () => Promise<T>,
        waitTime: number = 5000,
        leaseTime: number = 10000,
    ): Promise<T> {
        const lockKey = `lock:order:${orderId}`;
        return this.redisson.withLock(lockKey, operation, waitTime, leaseTime);
    }

    /**
     * Increment order view count (for analytics)
     */
    async incrementOrderViewCount(orderId: string): Promise<number> {
        const key = `order:views:${orderId}`;
        return this.redisson.increment(key);
    }

    /**
     * Get order view count
     */
    async getOrderViewCount(orderId: string): Promise<number> {
        const key = `order:views:${orderId}`;
        const count = await this.redisson.get(key);
        return count ? parseInt(count, 10) : 0;
    }

    private serializeOrder(order: Order): SerializedOrder {
        return {
            id: order.id,
            customerId: order.customerId,
            status: order.status.value,
            totalAmount: order.getTotalAmount().amount,
            items: order.items.map(item => ({
                id: item.id,
                productId: item.productId,
                quantity: item.quantity.value,
                unitPrice: item.unitPrice.amount,
                subtotal: item.getTotalPrice().amount,
            })),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };
    }
}

export interface SerializedOrder {
    id: string;
    customerId: string;
    status: string;
    totalAmount: number;
    items: SerializedOrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface SerializedOrderItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}
