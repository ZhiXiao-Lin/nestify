# Redis & Redisson Usage Guide

This guide demonstrates how to use the `@a3s-lab/redisson` package for caching, distributed locks, and other Redis operations in the NestJS application.

## Installation

The package is already installed as a workspace dependency:

```json
{
  "dependencies": {
    "@a3s-lab/redisson": "workspace:*"
  }
}
```

## Configuration

### Environment Variables

Add Redis configuration to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Module Setup

The `RedisModule` is configured globally in `src/shared/redis/redis.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedissonModule } from '@a3s-lab/redisson';

@Global()
@Module({
    imports: [
        RedissonModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD'),
                db: configService.get('REDIS_DB', 0),
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [RedissonModule],
})
export class RedisModule {}
```

## Basic Usage

### 1. Inject RedissonService

```typescript
import { Injectable } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

@Injectable()
export class MyService {
    constructor(private readonly redisson: RedissonService) {}

    async example() {
        // Your Redis operations here
    }
}
```

### 2. Simple Key-Value Operations

```typescript
// Set a value
await this.redisson.set('key', 'value');

// Set with TTL (time to live in seconds)
await this.redisson.set('key', 'value', 3600); // 1 hour

// Get a value
const value = await this.redisson.get('key');

// Delete a key
await this.redisson.delete('key');

// Check if key exists
const exists = await this.redisson.exists('key');
```

### 3. JSON Operations

```typescript
// Store JSON data
const user = { id: '123', name: 'John', email: 'john@example.com' };
await this.redisson.setJSON('user:123', user, 3600);

// Retrieve JSON data
const cachedUser = await this.redisson.getJSON<User>('user:123');

// Update JSON data
await this.redisson.setJSON('user:123', { ...user, name: 'Jane' });
```

### 4. Cache with Get-or-Set Pattern

```typescript
// Get from cache or execute factory function
const order = await this.redisson.getOrSet(
    'order:123',
    async () => {
        // This function only runs if cache miss
        return await this.orderRepository.findById('123');
    },
    3600, // TTL in seconds
);
```

### 5. Distributed Locks

Prevent race conditions with distributed locks:

```typescript
// Execute operation with lock
const result = await this.redisson.withLock(
    'lock:order:123',
    async () => {
        // Critical section - only one process can execute this at a time
        const order = await this.orderRepository.findById('123');
        order.confirm();
        return await this.orderRepository.save(order);
    },
    5000,  // Wait time (ms) - how long to wait for lock
    10000, // Lease time (ms) - how long to hold lock
);
```

### 6. Counters

```typescript
// Increment counter
const views = await this.redisson.increment('page:views');

// Increment by specific amount
const score = await this.redisson.increment('user:score', 10);

// Decrement counter
const remaining = await this.redisson.decrement('stock:product:123');
```

### 7. Hash Operations

```typescript
// Set hash field
await this.redisson.hset('user:123', 'name', 'John');
await this.redisson.hset('user:123', 'email', 'john@example.com');

// Get hash field
const name = await this.redisson.hget('user:123', 'name');

// Get all hash fields
const user = await this.redisson.hgetall('user:123');
// Returns: { name: 'John', email: 'john@example.com' }

// Delete hash field
await this.redisson.hdel('user:123', 'email');
```

### 8. Pattern-Based Deletion

```typescript
// Delete all keys matching pattern
const deletedCount = await this.redisson.deleteByPattern('cache:order:*');
console.log(`Deleted ${deletedCount} keys`);
```

### 9. Expiration

```typescript
// Set expiration on existing key
await this.redisson.expire('key', 3600); // 1 hour
```

## Real-World Example: Order Cache Service

See `src/modules/order/infrastructure/cache/order-cache.service.ts` for a complete implementation:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

@Injectable()
export class OrderCacheService {
    private readonly logger = new Logger(OrderCacheService.name);

    constructor(private readonly redisson: RedissonService) {}

    // Cache an order
    async cacheOrder(order: Order, ttl: number = 3600): Promise<void> {
        const key = `order:${order.id}`;
        await this.redisson.setJSON(key, this.serializeOrder(order), ttl);
    }

    // Get cached order
    async getCachedOrder(orderId: string): Promise<SerializedOrder | null> {
        const key = `order:${orderId}`;
        return this.redisson.getJSON<SerializedOrder>(key);
    }

    // Get or fetch order with cache
    async getOrSetOrder(
        orderId: string,
        factory: () => Promise<Order | null>,
        ttl: number = 3600,
    ): Promise<SerializedOrder | null> {
        const key = `order:${orderId}`;
        return this.redisson.getOrSet<SerializedOrder | null>(
            key,
            async () => {
                const order = await factory();
                return order ? this.serializeOrder(order) : null;
            },
            ttl,
        );
    }

    // Execute with distributed lock
    async withOrderLock<T>(
        orderId: string,
        operation: () => Promise<T>,
    ): Promise<T> {
        const lockKey = `lock:order:${orderId}`;
        return this.redisson.withLock(lockKey, operation, 5000, 10000);
    }

    // Increment view count
    async incrementOrderViewCount(orderId: string): Promise<number> {
        const key = `order:views:${orderId}`;
        return this.redisson.increment(key);
    }
}
```

## Usage in Query Handlers

### Example: Get Order with Cache

```typescript
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrderCacheService } from '../../infrastructure/cache/order-cache.service';
import { OrderRepository } from '../../infrastructure/persistence/kysely-order.repository';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly cacheService: OrderCacheService,
    ) {}

    async execute(query: GetOrderQuery): Promise<OrderResponseDto> {
        // Try cache first
        const cached = await this.cacheService.getCachedOrder(query.orderId);
        if (cached) {
            return this.toDto(cached);
        }

        // Cache miss - fetch from database
        const order = await this.orderRepository.findById(query.orderId);
        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Cache for future requests
        await this.cacheService.cacheOrder(order);

        // Increment view count
        await this.cacheService.incrementOrderViewCount(query.orderId);

        return this.toDto(order);
    }
}
```

### Example: Update Order with Lock

```typescript
@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderHandler implements ICommandHandler<ConfirmOrderCommand> {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly cacheService: OrderCacheService,
    ) {}

    async execute(command: ConfirmOrderCommand): Promise<void> {
        // Use distributed lock to prevent race conditions
        await this.cacheService.withOrderLock(command.orderId, async () => {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new NotFoundException('Order not found');
            }

            order.confirm();
            await this.orderRepository.save(order);

            // Invalidate cache after update
            await this.cacheService.invalidateOrder(command.orderId);
            await this.cacheService.invalidateCustomerOrders(order.customerId);
        });
    }
}
```

## Advanced Features

### Lua Scripts

Execute Lua scripts for atomic operations:

```typescript
const script = `
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) > tonumber(ARGV[1]) then
        return redis.call('DECRBY', KEYS[1], ARGV[1])
    else
        return -1
    end
`;

const result = await this.redisson.eval(script, ['stock:product:123'], ['5']);
```

### Script Caching

Load and cache scripts for better performance:

```typescript
// Load script once
const sha1 = await this.redisson.scriptLoad(script);

// Execute cached script multiple times
const result = await this.redisson.evalsha(sha1, ['key'], ['arg']);
```

## Best Practices

1. **Use Appropriate TTL**: Set reasonable expiration times to prevent stale data
2. **Cache Invalidation**: Always invalidate cache after updates
3. **Distributed Locks**: Use locks for critical sections to prevent race conditions
4. **Key Naming**: Use consistent, hierarchical key naming (e.g., `entity:id:field`)
5. **Error Handling**: Always handle Redis errors gracefully with fallbacks
6. **Monitoring**: Log cache hits/misses for performance monitoring

## Testing

### Start Redis with Docker

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### Test Connection

```bash
redis-cli ping
# Should return: PONG
```

## Troubleshooting

### Connection Issues

```typescript
// Check if Redis is connected
try {
    await this.redisson.redis.ping();
    console.log('Redis connected');
} catch (error) {
    console.error('Redis connection failed:', error);
}
```

### Memory Issues

```bash
# Check Redis memory usage
redis-cli INFO memory

# Clear all keys (development only!)
redis-cli FLUSHDB
```

## Performance Tips

1. **Batch Operations**: Use pipelines for multiple operations
2. **Compression**: Compress large JSON objects before caching
3. **Lazy Loading**: Only cache frequently accessed data
4. **TTL Strategy**: Use shorter TTL for frequently changing data
5. **Connection Pooling**: Configure appropriate pool size in production

## References

- [Redisson Documentation](https://github.com/redisson/redisson)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Commands](https://redis.io/commands)
