// ============================================================================
// Rate Limiting Service - API throttling and abuse protection
// ============================================================================

import { Injectable, OnModuleDestroy, HttpException, HttpStatus } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

export interface RateLimitConfig {
    /** Maximum requests allowed in window */
    limit: number;
    /** Window size in seconds */
    windowSeconds: number;
    /** Key prefix for Redis */
    keyPrefix?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
    // 100 requests per minute per user
    default: { limit: 100, windowSeconds: 60 },
    // 10 requests per minute for auth endpoints
    auth: { limit: 10, windowSeconds: 60 },
    // 5 requests per minute for password reset
    passwordReset: { limit: 5, windowSeconds: 60 },
    // 1000 requests per hour for API
    api: { limit: 1000, windowSeconds: 3600 },
    // 100 requests per minute for file uploads
    upload: { limit: 100, windowSeconds: 60 },
};

@Injectable()
export class RateLimitingService implements OnModuleDestroy {
    private readonly keyPrefix = 'ratelimit:';
    private readonly localCache: Map<string, { count: number; resetAt: number }> = new Map();

    constructor(private readonly redis: RedissonService) {}

    /**
     * Check rate limit using sliding window algorithm
     */
    async checkLimit(
        identifier: string,
        config: RateLimitConfig = DEFAULT_RATE_LIMITS.default,
    ): Promise<RateLimitResult> {
        const key = `${config.keyPrefix ?? this.keyPrefix}${identifier}`;
        const now = Date.now();
        const windowMs = config.windowSeconds * 1000;
        const windowStart = now - windowMs;

        try {
            // Use Redis sorted set for sliding window
            const redisClient = (this.redis as any).redis;
            const pipeline = redisClient.pipeline();

            // Remove old entries outside window
            pipeline.zremrangebyscore(key, 0, windowStart);

            // Add current request
            pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);

            // Count requests in window
            pipeline.zcard(key);

            // Set expiry on key
            pipeline.expire(key, config.windowSeconds + 1);

            const results = await pipeline.exec();
            const count = results[2][1] as number;

            const allowed = count <= config.limit;
            const remaining = Math.max(0, config.limit - count);
            const resetAt = new Date(now + windowMs);

            if (!allowed) {
                // Calculate when the oldest request will expire
                const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
                const oldestTime = oldest.length >= 2 ? parseInt(oldest[1]) : now;
                const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);

                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                    retryAfter,
                };
            }

            return { allowed: true, remaining, resetAt };
        } catch (error) {
            // Fallback to local cache if Redis fails
            return this.checkLimitLocal(identifier, config);
        }
    }

    /**
     * Fallback local rate limiting
     */
    private checkLimitLocal(
        identifier: string,
        config: RateLimitConfig,
    ): RateLimitResult {
        const key = identifier;
        const now = Date.now();
        const windowMs = config.windowSeconds * 1000;

        const cached = this.localCache.get(key);

        if (!cached || cached.resetAt < now) {
            // Start new window
            this.localCache.set(key, { count: 1, resetAt: now + windowMs });
            return {
                allowed: true,
                remaining: config.limit - 1,
                resetAt: new Date(now + windowMs),
            };
        }

        cached.count++;
        const allowed = cached.count <= config.limit;
        const remaining = Math.max(0, config.limit - cached.count);

        if (!allowed) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(cached.resetAt),
                retryAfter: Math.ceil((cached.resetAt - now) / 1000),
            };
        }

        return {
            allowed: true,
            remaining,
            resetAt: new Date(cached.resetAt),
        };
    }

    /**
     * Reset rate limit for an identifier
     */
    async resetLimit(identifier: string): Promise<void> {
        const key = `${this.keyPrefix}${identifier}`;
        await this.redis.delete(key);
        this.localCache.delete(identifier);
    }

    /**
     * Get current usage for an identifier
     */
    async getUsage(identifier: string): Promise<{ count: number; resetAt: Date }> {
        const key = `${this.keyPrefix}${identifier}`;
        const now = Date.now();

        try {
            const redisClient = (this.redis as any).redis;
            const count = await redisClient.zcard(key);
            const ttl = await redisClient.ttl(key);
            return {
                count,
                resetAt: new Date(now + ttl * 1000),
            };
        } catch {
            const cached = this.localCache.get(identifier);
            if (cached) {
                return { count: cached.count, resetAt: new Date(cached.resetAt) };
            }
            return { count: 0, resetAt: new Date(now) };
        }
    }

    onModuleDestroy(): void {
        this.localCache.clear();
    }
}

/**
 * Rate limit exceeded exception
 */
export class RateLimitExceededException extends HttpException {
    constructor(retryAfter: number) {
        super(
            {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: 'Too many requests',
                error: 'Rate limit exceeded',
                retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}
