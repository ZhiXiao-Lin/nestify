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

const MAX_RATE_LIMIT = 1_000_000;
const MAX_RATE_LIMIT_WINDOW_SECONDS = 31_536_000;
const MAX_RATE_LIMIT_IDENTIFIER_LENGTH = 4_096;
const MAX_LOCAL_RATE_LIMIT_ENTRIES = 1_000_000;
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

interface NormalizedRateLimitingOptions {
    readonly backendFailureMode: RateLimitBackendFailureMode;
    readonly maxLocalEntries: number;
    readonly identifierExtractor?: RateLimitIdentifierExtractor;
}

interface NormalizedRateLimitConfig {
    readonly limit: number;
    readonly windowSeconds: number;
    readonly keyPrefix?: string;
    readonly policy?: string;
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

export const DEFAULT_RATE_LIMITS = Object.freeze({
    default: Object.freeze({ limit: 100, windowSeconds: 60, policy: 'default' }),
    auth: Object.freeze({ limit: 10, windowSeconds: 60, policy: 'auth' }),
    api: Object.freeze({ limit: 1_000, windowSeconds: 3_600, policy: 'api' }),
    upload: Object.freeze({ limit: 100, windowSeconds: 60, policy: 'upload' }),
}) satisfies Readonly<Record<string, Readonly<RateLimitConfig>>>;

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local ttl = tonumber(ARGV[4])
local limit = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
    redis.call('ZADD', key, now, member)
    count = count + 1
    allowed = 1
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
redis.call('EXPIRE', key, ttl)

local oldestScore = now
if #oldest >= 2 then
    oldestScore = tonumber(oldest[2])
end

return { count, oldestScore, allowed }
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
        const normalized = normalizeRateLimitingOptions(options);
        this.backendFailureMode = normalized.backendFailureMode;
        this.maxLocalEntries = normalized.maxLocalEntries;
    }

    async checkLimit(
        identifier: string,
        config: RateLimitConfig = DEFAULT_RATE_LIMITS.default,
    ): Promise<RateLimitResult> {
        const normalizedConfig = normalizeRateLimitConfig(config);
        const normalizedIdentifier = normalizeIdentifier(identifier);
        const key = createRateLimitStorageKey(normalizedIdentifier, normalizedConfig);
        const now = Date.now();
        try {
            return await this.checkLimitRedis(key, normalizedConfig, now);
        } catch {
            return this.handleBackendFailure(key, normalizedConfig, now);
        }
    }

    onModuleDestroy(): void {
        this.localCache.clear();
    }

    private async checkLimitRedis(
        key: string,
        config: NormalizedRateLimitConfig,
        now: number,
    ): Promise<RateLimitResult> {
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
            config.limit.toString(),
        );
        if (!Array.isArray(result) || result.length < 3) {
            throw new TypeError('Redis returned an invalid rate limit result');
        }

        const count = toNonNegativeSafeInteger(result[0], 'count');
        const oldestTime = toNonNegativeSafeInteger(result[1], 'oldest timestamp');
        const allowedValue = toNonNegativeSafeInteger(result[2], 'allowed flag');
        if (allowedValue !== 0 && allowedValue !== 1) {
            throw new TypeError('Redis returned an invalid rate limit allowed flag');
        }
        const resetTime = Math.max(now, oldestTime + windowMs);
        const allowed = allowedValue === 1;
        if (!Number.isSafeInteger(resetTime) || resetTime > MAX_DATE_TIMESTAMP) {
            throw new TypeError('Redis returned an invalid rate limit reset timestamp');
        }
        if ((allowed && count > config.limit) || (!allowed && count < config.limit)) {
            throw new TypeError('Redis returned an inconsistent rate limit result');
        }
        return {
            allowed,
            remaining: allowed ? Math.max(0, config.limit - count) : 0,
            resetAt: new Date(resetTime),
            retryAfter: allowed ? undefined : Math.max(1, Math.ceil((resetTime - now) / 1000)),
        };
    }

    private handleBackendFailure(key: string, config: NormalizedRateLimitConfig, now: number): RateLimitResult {
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

    private checkLimitLocal(key: string, config: NormalizedRateLimitConfig, now: number): RateLimitResult {
        const windowMs = config.windowSeconds * 1000;
        const cached = this.localCache.get(key);
        if (!cached || cached.resetAt <= now) {
            this.ensureLocalCapacity(key, now);
            this.localCache.set(key, { count: 1, resetAt: now + windowMs });
            return { allowed: true, remaining: config.limit - 1, resetAt: new Date(now + windowMs) };
        }

        cached.count = Math.min(config.limit + 1, cached.count + 1);
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
            const oldestKey = this.localCache.keys().next().value as string;
            this.localCache.delete(oldestKey);
        }
    }
}

interface RedisRateLimitClient {
    eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
}

export const RATE_LIMIT_CONFIG_KEY = 'resilience:rate_limit_config';
export const RateLimit = (config?: RateLimitConfig) =>
    SetMetadata(RATE_LIMIT_CONFIG_KEY, normalizeRateLimitConfig(config ?? DEFAULT_RATE_LIMITS.default));
export const RateLimitByName = (name: keyof typeof DEFAULT_RATE_LIMITS) => {
    const config = DEFAULT_RATE_LIMITS[name];
    if (!config) throw new TypeError(`Unknown rate limit policy: ${String(name)}`);
    return SetMetadata(RATE_LIMIT_CONFIG_KEY, config);
};
export const RateLimitAuth = () => RateLimitByName('auth');
export const RateLimitApi = () => RateLimitByName('api');
export const RateLimitUpload = () => RateLimitByName('upload');

@Injectable()
export class RateLimitingGuard implements CanActivate {
    private readonly options: NormalizedRateLimitingOptions;

    constructor(
        private readonly rateLimitingService: RateLimitingService,
        private readonly reflector: Reflector,
        @Optional()
        @Inject(RATE_LIMITING_OPTIONS)
        options: RateLimitingOptions = {},
    ) {
        this.options = normalizeRateLimitingOptions(options);
    }

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
            'RateLimit-Limit': config.limit,
            'RateLimit-Remaining': result.remaining,
            'RateLimit-Reset': Math.max(0, Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000)),
        });
        if (!result.allowed) {
            response.set({ 'Retry-After': result.retryAfter ?? config.windowSeconds });
            throw new RateLimitExceededException(result.retryAfter);
        }
        return true;
    }

    private async getIdentifier(request: RateLimitRequest): Promise<string> {
        if (this.options.identifierExtractor) {
            const identifier = await this.options.identifierExtractor(request);
            if (typeof identifier !== 'string') {
                throw new TypeError('rate limit identifier extractor must return a string');
            }
            return `custom:${normalizeIdentifier(identifier)}`;
        }
        if (typeof request.user?.sub === 'string' && request.user.sub.trim()) {
            return `user:${normalizeIdentifier(request.user.sub)}`;
        }
        const ip = request.ip || request.socket?.remoteAddress;
        if (typeof ip !== 'string' || !ip.trim()) {
            throw new TypeError('rate limit request does not expose a verified identifier');
        }
        return `ip:${normalizeIdentifier(ip)}`;
    }
}

export function createRateLimitStorageKey(identifier: string, config: RateLimitConfig): string {
    const normalizedConfig = normalizeRateLimitConfig(config);
    const prefix = normalizeKeySegment(normalizedConfig.keyPrefix ?? 'ratelimit');
    const policy = normalizeKeySegment(
        normalizedConfig.policy ?? `${normalizedConfig.limit}-${normalizedConfig.windowSeconds}`,
    );
    const identityHash = createHash('sha256').update(normalizeIdentifier(identifier)).digest('hex');
    return `${prefix}:${policy}:${identityHash}`;
}

function normalizeRateLimitConfig(config: RateLimitConfig): NormalizedRateLimitConfig {
    if (!config || typeof config !== 'object') throw new TypeError('rate limit config must be an object');
    if (!Number.isSafeInteger(config.limit) || config.limit < 1 || config.limit > MAX_RATE_LIMIT) {
        throw new RangeError(`rate limit must be a positive safe integer no greater than ${MAX_RATE_LIMIT}`);
    }
    if (
        !Number.isSafeInteger(config.windowSeconds) ||
        config.windowSeconds < 1 ||
        config.windowSeconds > MAX_RATE_LIMIT_WINDOW_SECONDS
    ) {
        throw new RangeError(
            `rate limit windowSeconds must be a positive safe integer no greater than ${MAX_RATE_LIMIT_WINDOW_SECONDS}`,
        );
    }
    const keyPrefix = config.keyPrefix === undefined ? undefined : normalizeKeySegment(config.keyPrefix);
    const policy = config.policy === undefined ? undefined : normalizeKeySegment(config.policy);
    return Object.freeze({ limit: config.limit, windowSeconds: config.windowSeconds, keyPrefix, policy });
}

function normalizeKeySegment(value: string): string {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError('rate limit key segment must not be empty');
    const normalized = value.trim();
    if (normalized.length > 128) throw new RangeError('rate limit key segment cannot exceed 128 characters');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/u.test(normalized)) {
        throw new TypeError('rate limit key segment contains unsupported characters');
    }
    return normalized;
}

function toNonNegativeSafeInteger(value: unknown, label: string): number {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(number) || number < 0) {
        throw new TypeError(`Redis returned an invalid rate limit ${label}`);
    }
    return number;
}

function normalizeIdentifier(identifier: string): string {
    if (typeof identifier !== 'string' || !identifier.trim()) {
        throw new TypeError('rate limit identifier must not be empty');
    }
    const normalized = identifier.trim();
    if (normalized.length > MAX_RATE_LIMIT_IDENTIFIER_LENGTH) {
        throw new RangeError(`rate limit identifier cannot exceed ${MAX_RATE_LIMIT_IDENTIFIER_LENGTH} characters`);
    }
    if (/[\u0000-\u001f\u007f]/u.test(normalized)) {
        throw new TypeError('rate limit identifier cannot contain control characters');
    }
    return normalized;
}

function normalizeRateLimitingOptions(options: RateLimitingOptions): NormalizedRateLimitingOptions {
    if (!options || typeof options !== 'object') throw new TypeError('rate limiting options must be an object');
    const backendFailureMode = options.backendFailureMode ?? DEFAULT_RATE_LIMITING_OPTIONS.backendFailureMode;
    if (backendFailureMode !== 'local' && backendFailureMode !== 'allow' && backendFailureMode !== 'deny') {
        throw new TypeError('backendFailureMode must be local, allow, or deny');
    }
    const maxLocalEntries = options.maxLocalEntries ?? DEFAULT_RATE_LIMITING_OPTIONS.maxLocalEntries;
    if (
        !Number.isSafeInteger(maxLocalEntries) ||
        maxLocalEntries < 1 ||
        maxLocalEntries > MAX_LOCAL_RATE_LIMIT_ENTRIES
    ) {
        throw new RangeError(
            `maxLocalEntries must be a positive safe integer no greater than ${MAX_LOCAL_RATE_LIMIT_ENTRIES}`,
        );
    }
    if (options.identifierExtractor !== undefined && typeof options.identifierExtractor !== 'function') {
        throw new TypeError('identifierExtractor must be a function');
    }
    return Object.freeze({ backendFailureMode, maxLocalEntries, identifierExtractor: options.identifierExtractor });
}
