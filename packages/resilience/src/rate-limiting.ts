import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    OnModuleDestroy,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedissonService } from '@a3s-lab/redisson';
import type { Request } from 'express';

export interface RateLimitConfig {
    limit: number;
    windowSeconds: number;
    keyPrefix?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

export class RateLimitExceededException extends HttpException {
    constructor(retryAfter?: number) {
        super(
            {
                status: 'TOO_MANY_REQUESTS',
                message: 'Too many requests',
                retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}

export const DEFAULT_RATE_LIMITS = {
    default: { limit: 100, windowSeconds: 60 },
    auth: { limit: 10, windowSeconds: 60 },
    api: { limit: 1000, windowSeconds: 3600 },
    upload: { limit: 100, windowSeconds: 60 },
} satisfies Record<string, RateLimitConfig>;

@Injectable()
export class RateLimitingService implements OnModuleDestroy {
    private readonly localCache = new Map<string, { count: number; resetAt: number }>();

    constructor(private readonly redis: RedissonService) {}

    async checkLimit(
        identifier: string,
        config: RateLimitConfig = DEFAULT_RATE_LIMITS.default,
    ): Promise<RateLimitResult> {
        const key = `${config.keyPrefix ?? 'ratelimit:'}${identifier}`;
        const now = Date.now();
        const windowMs = config.windowSeconds * 1000;
        try {
            const redisClient = (this.redis as unknown as { redis: RedisSortedSetClient }).redis;
            const pipeline = redisClient.pipeline();
            pipeline.zremrangebyscore(key, 0, now - windowMs);
            pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);
            pipeline.zcard(key);
            pipeline.expire(key, config.windowSeconds + 1);
            const results = await pipeline.exec();
            const count = Number(results[2]?.[1] ?? 0);
            const resetAt = new Date(now + windowMs);
            if (count > config.limit) {
                const oldest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
                const oldestTime = oldest.length >= 2 ? Number.parseInt(oldest[1], 10) : now;
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                    retryAfter: Math.ceil((oldestTime + windowMs - now) / 1000),
                };
            }
            return { allowed: true, remaining: Math.max(0, config.limit - count), resetAt };
        } catch {
            return this.checkLimitLocal(identifier, config);
        }
    }

    onModuleDestroy(): void {
        this.localCache.clear();
    }

    private checkLimitLocal(identifier: string, config: RateLimitConfig): RateLimitResult {
        const now = Date.now();
        const windowMs = config.windowSeconds * 1000;
        const cached = this.localCache.get(identifier);
        if (!cached || cached.resetAt < now) {
            this.localCache.set(identifier, { count: 1, resetAt: now + windowMs });
            return { allowed: true, remaining: config.limit - 1, resetAt: new Date(now + windowMs) };
        }
        cached.count += 1;
        const allowed = cached.count <= config.limit;
        return {
            allowed,
            remaining: allowed ? Math.max(0, config.limit - cached.count) : 0,
            resetAt: new Date(cached.resetAt),
            retryAfter: allowed ? undefined : Math.ceil((cached.resetAt - now) / 1000),
        };
    }
}

interface RedisPipeline {
    zremrangebyscore(key: string, min: number, max: number): void;
    zadd(key: string, score: string, member: string): void;
    zcard(key: string): void;
    expire(key: string, seconds: number): void;
    exec(): Promise<Array<[unknown, unknown]>>;
}

interface RedisSortedSetClient {
    pipeline(): RedisPipeline;
    zrange(key: string, start: number, stop: number, withScores: 'WITHSCORES'): Promise<string[]>;
}

export const RATE_LIMIT_CONFIG_KEY = 'resilience:rate_limit_config';
export const RateLimit = (config?: RateLimitConfig) =>
    SetMetadata(RATE_LIMIT_CONFIG_KEY, config ?? DEFAULT_RATE_LIMITS.default);
export const RateLimitByName = (name: keyof typeof DEFAULT_RATE_LIMITS) =>
    SetMetadata(RATE_LIMIT_CONFIG_KEY, DEFAULT_RATE_LIMITS[name]);
export const RateLimitAuth = () => RateLimitByName('auth');
export const RateLimitApi = () => RateLimitByName('api');
export const RateLimitUpload = () => RateLimitByName('upload');

@Injectable()
export class RateLimitingGuard implements CanActivate {
    constructor(
        private readonly rateLimitingService: RateLimitingService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(RATE_LIMIT_CONFIG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!config) return true;

        const request = context.switchToHttp().getRequest<Request & { user?: { sub?: string } }>();
        const result = await this.rateLimitingService.checkLimit(this.getIdentifier(request), config);
        const response = context.switchToHttp().getResponse<{ set(headers: Record<string, string | number>): void }>();
        response.set({
            'X-RateLimit-Limit': config.limit,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.resetAt.toISOString(),
        });
        if (!result.allowed) {
            response.set({ 'Retry-After': result.retryAfter ?? 60 });
            throw new HttpException(
                {
                    status: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests',
                    retryAfter: result.retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        return true;
    }

    private getIdentifier(request: Request & { user?: { sub?: string } }): string {
        if (request.user?.sub) return `user:${request.user.sub}`;
        const forwarded = request.headers['x-forwarded-for'];
        const ip = Array.isArray(forwarded)
            ? forwarded[0]
            : typeof forwarded === 'string'
              ? forwarded.split(',')[0]?.trim()
              : (request.ip ?? request.socket.remoteAddress ?? 'unknown');
        return `ip:${ip}`;
    }
}
