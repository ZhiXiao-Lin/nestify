import { createHash, randomUUID } from 'node:crypto';
import { RedissonService } from '@a3s-lab/redisson';
import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    OnModuleDestroy,
    Optional,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export interface RateLimitConfig {
    limit: number;
    windowSeconds: number;
    keyPrefix?: string;
    policy?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

export type RateLimitRequest = Request & { user?: { sub?: string } };
export type RateLimitIdentifierExtractor = (request: RateLimitRequest) => string | Promise<string>;
export type RateLimitBackendFailureMode = 'local' | 'allow' | 'deny';

export interface RateLimitingOptions {
    backendFailureMode?: RateLimitBackendFailureMode;
    maxLocalEntries?: number;
    identifierExtractor?: RateLimitIdentifierExtractor;
}

export const RATE_LIMITING_OPTIONS = Symbol('RATE_LIMITING_OPTIONS');
export const DEFAULT_RATE_LIMITING_OPTIONS = Object.freeze({
    backendFailureMode: 'local' as const,
    maxLocalEntries: 10_000,
});

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
    default: { limit: 100, windowSeconds: 60, policy: 'default' },
    auth: { limit: 10, windowSeconds: 60, policy: 'auth' },
    api: { limit: 1000, windowSeconds: 3600, policy: 'api' },
    upload: { limit: 100, windowSeconds: 60, policy: 'upload' },
} satisfies Record<string, RateLimitConfig>;

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local ttl = tonumber(ARGV[4])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
redis.call('EXPIRE', key, ttl)

local oldestScore = now
if #oldest >= 2 then
    oldestScore = tonumber(oldest[2])
end

return { count, oldestScore }
`;

@Injectable()
export class RateLimitingService implements OnModuleDestroy {
    private readonly localCache = new Map<string, { count: number; resetAt: number }>();
    private readonly backendFailureMode: RateLimitBackendFailureMode;
    private readonly maxLocalEntries: number;

    constructor(
        private readonly redis: RedissonService,
        @Optional()
        @Inject(RATE_LIMITING_OPTIONS)
        options: RateLimitingOptions = {},
    ) {
        this.backendFailureMode = options.backendFailureMode ?? DEFAULT_RATE_LIMITING_OPTIONS.backendFailureMode;
        this.maxLocalEntries = options.maxLocalEntries ?? DEFAULT_RATE_LIMITING_OPTIONS.maxLocalEntries;
        if (!Number.isSafeInteger(this.maxLocalEntries) || this.maxLocalEntries < 1) {
            throw new RangeError('maxLocalEntries must be a positive safe integer');
        }
    }

    async checkLimit(
        identifier: string,
        config: RateLimitConfig = DEFAULT_RATE_LIMITS.default,
    ): Promise<RateLimitResult> {
        validateRateLimitConfig(config);
        if (!identifier.trim()) {
            throw new TypeError('rate limit identifier must not be empty');
        }

        const key = createRateLimitStorageKey(identifier, config);
        const now = Date.now();
        try {
            return await this.checkLimitRedis(key, config, now);
        } catch {
            return this.handleBackendFailure(key, config, now);
        }
    }

    onModuleDestroy(): void {
        this.localCache.clear();
    }

    private async checkLimitRedis(key: string, config: RateLimitConfig, now: number): Promise<RateLimitResult> {
        const windowMs = config.windowSeconds * 1000;
        const redisClient = (this.redis as unknown as { redis: RedisRateLimitClient }).redis;
        const result = await redisClient.eval(
            SLIDING_WINDOW_SCRIPT,
            1,
            key,
            now.toString(),
            windowMs.toString(),
            `${now}:${randomUUID()}`,
            (config.windowSeconds + 1).toString(),
        );
        if (!Array.isArray(result) || result.length < 2) {
            throw new TypeError('Redis returned an invalid rate limit result');
        }

        const count = toFiniteNumber(result[0], 'count');
        const oldestTime = toFiniteNumber(result[1], 'oldest timestamp');
        const resetTime = Math.max(now, oldestTime + windowMs);
        const allowed = count <= config.limit;
        return {
            allowed,
            remaining: allowed ? Math.max(0, config.limit - count) : 0,
            resetAt: new Date(resetTime),
            retryAfter: allowed ? undefined : Math.max(1, Math.ceil((resetTime - now) / 1000)),
        };
    }

    private handleBackendFailure(key: string, config: RateLimitConfig, now: number): RateLimitResult {
        const resetAt = new Date(now + config.windowSeconds * 1000);
        if (this.backendFailureMode === 'allow') {
            return { allowed: true, remaining: config.limit, resetAt };
        }
        if (this.backendFailureMode === 'deny') {
            return {
                allowed: false,
                remaining: 0,
                resetAt,
                retryAfter: config.windowSeconds,
            };
        }
        return this.checkLimitLocal(key, config, now);
    }

    private checkLimitLocal(key: string, config: RateLimitConfig, now: number): RateLimitResult {
        const windowMs = config.windowSeconds * 1000;
        const cached = this.localCache.get(key);
        if (!cached || cached.resetAt <= now) {
            this.ensureLocalCapacity(key, now);
            this.localCache.set(key, { count: 1, resetAt: now + windowMs });
            return { allowed: true, remaining: config.limit - 1, resetAt: new Date(now + windowMs) };
        }

        cached.count += 1;
        const allowed = cached.count <= config.limit;
        return {
            allowed,
            remaining: allowed ? Math.max(0, config.limit - cached.count) : 0,
            resetAt: new Date(cached.resetAt),
            retryAfter: allowed ? undefined : Math.max(1, Math.ceil((cached.resetAt - now) / 1000)),
        };
    }

    private ensureLocalCapacity(incomingKey: string, now: number): void {
        if (this.localCache.has(incomingKey)) {
            return;
        }
        for (const [key, value] of this.localCache) {
            if (value.resetAt <= now) {
                this.localCache.delete(key);
            }
        }
        while (this.localCache.size >= this.maxLocalEntries) {
            const oldestKey = this.localCache.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.localCache.delete(oldestKey);
        }
    }
}

interface RedisRateLimitClient {
    eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
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
        @Optional()
        @Inject(RATE_LIMITING_OPTIONS)
        private readonly options: RateLimitingOptions = {},
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this.reflector.getAllAndOverride<RateLimitConfig | undefined>(RATE_LIMIT_CONFIG_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!config) return true;

        const request = context.switchToHttp().getRequest<RateLimitRequest>();
        const result = await this.rateLimitingService.checkLimit(await this.getIdentifier(request), config);
        const response = context.switchToHttp().getResponse<{ set(headers: Record<string, string | number>): void }>();
        response.set({
            'X-RateLimit-Limit': config.limit,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.resetAt.toISOString(),
        });
        if (!result.allowed) {
            response.set({ 'Retry-After': result.retryAfter ?? config.windowSeconds });
            throw new RateLimitExceededException(result.retryAfter);
        }
        return true;
    }

    private async getIdentifier(request: RateLimitRequest): Promise<string> {
        if (this.options.identifierExtractor) {
            const identifier = (await this.options.identifierExtractor(request)).trim();
            if (!identifier) {
                throw new TypeError('rate limit identifier extractor returned an empty value');
            }
            return `custom:${identifier}`;
        }
        if (request.user?.sub?.trim()) {
            return `user:${request.user.sub.trim()}`;
        }
        return `ip:${request.ip || request.socket.remoteAddress || 'unknown'}`;
    }
}

export function createRateLimitStorageKey(identifier: string, config: RateLimitConfig): string {
    validateRateLimitConfig(config);
    const prefix = normalizeKeySegment(config.keyPrefix ?? 'ratelimit');
    const policy = normalizeKeySegment(config.policy ?? `${config.limit}-${config.windowSeconds}`);
    const identityHash = createHash('sha256').update(identifier).digest('hex');
    return `${prefix}:${policy}:${identityHash}`;
}

function validateRateLimitConfig(config: RateLimitConfig): void {
    if (!Number.isSafeInteger(config.limit) || config.limit < 1) {
        throw new RangeError('rate limit must be a positive safe integer');
    }
    if (!Number.isSafeInteger(config.windowSeconds) || config.windowSeconds < 1) {
        throw new RangeError('rate limit windowSeconds must be a positive safe integer');
    }
}

function normalizeKeySegment(value: string): string {
    const normalized = value
        .trim()
        .replace(/[^a-zA-Z0-9:_-]/g, '_')
        .slice(0, 128);
    if (!normalized) {
        throw new TypeError('rate limit key segment must not be empty');
    }
    return normalized;
}

function toFiniteNumber(value: unknown, label: string): number {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new TypeError(`Redis returned an invalid rate limit ${label}`);
    }
    return number;
}
