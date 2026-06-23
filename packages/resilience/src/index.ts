import {
    CallHandler,
    CanActivate,
    DynamicModule,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    Module,
    NestInterceptor,
    OnModuleDestroy,
    SetMetadata,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { RedissonService } from '@a3s-lab/redisson';
import type { Request } from 'express';
import { Observable, from, of, throwError, lastValueFrom } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: Array<new (...args: unknown[]) => Error>;
    isRetryable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

export const DEFAULT_RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];

const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [] as Array<new (...args: unknown[]) => Error>,
    isRetryable: () => true,
};

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    async execute<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<RetryResult<T>> {
        const opts = {
            ...DEFAULT_RETRY_OPTIONS,
            ...options,
            retryableErrors: options.retryableErrors ?? DEFAULT_RETRY_OPTIONS.retryableErrors,
            isRetryable: options.isRetryable ?? DEFAULT_RETRY_OPTIONS.isRetryable,
        };
        const startTime = Date.now();
        let lastError: Error | undefined;
        let attempt = 0;

        while (attempt < opts.maxAttempts) {
            attempt += 1;
            try {
                const result = await fn();
                return { success: true, result, attempts: attempt, totalDuration: Date.now() - startTime };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt >= opts.maxAttempts || !this.isRetryable(lastError, opts)) {
                    break;
                }
                const delay = this.calculateDelay(attempt, opts) + this.calculateJitter(opts.initialDelay);
                options.onRetry?.(attempt, lastError, delay);
                this.logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms: ${lastError.message}`);
                await sleep(delay);
            }
        }

        return { success: false, error: lastError, attempts: attempt, totalDuration: Date.now() - startTime };
    }

    async executeOrThrow<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
        const result = await this.execute(fn, options);
        if (!result.success) {
            throw new RetryExhaustedError(result.attempts, result.totalDuration, result.error);
        }
        return result.result as T;
    }

    private isRetryable(
        error: Error,
        options: { retryableErrors: Array<new (...args: unknown[]) => Error>; isRetryable: (error: Error) => boolean },
    ): boolean {
        return options.retryableErrors.some(ErrorClass => error instanceof ErrorClass) || options.isRetryable(error);
    }

    private calculateDelay(
        attempt: number,
        options: { initialDelay: number; backoffMultiplier: number; maxDelay: number },
    ): number {
        return Math.min(options.initialDelay * options.backoffMultiplier ** (attempt - 1), options.maxDelay);
    }

    private calculateJitter(delay: number): number {
        return Math.round(Math.random() * delay * 0.25);
    }
}

export class RetryExhaustedError extends Error {
    constructor(
        public readonly attempts: number,
        public readonly totalDuration: number,
        public readonly lastError?: Error,
    ) {
        super(
            `Retry exhausted after ${attempts} attempts (${totalDuration}ms): ${lastError?.message ?? 'Unknown error'}`,
        );
        this.name = 'RetryExhaustedError';
    }
}

export const RETRY_OPTIONS = 'resilience:retry_options';
export interface RetryDecoratorOptions extends RetryOptions {
    name?: string;
}
export const Retry = (options: RetryDecoratorOptions = {}) => SetMetadata(RETRY_OPTIONS, options);

@Injectable()
export class RetryInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly retry: RetryService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const options = this.reflector.getAllAndOverride<RetryDecoratorOptions | undefined>(RETRY_OPTIONS, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!options) return next.handle();
        return from(this.retry.executeOrThrow(() => lastValueFrom(next.handle()), options));
    }
}

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
    failureThreshold?: number;
    successThreshold?: number;
    resetTimeout?: number;
    name?: string;
}

export interface CircuitBreakerStats {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure?: Date;
    lastSuccess?: Date;
    nextAttempt?: Date;
}

const DEFAULT_CIRCUIT_OPTIONS: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000,
    name: 'default',
};

@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
    private readonly circuits = new Map<string, CircuitBreakerInstance>();

    getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreakerInstance {
        const existing = this.circuits.get(name);
        if (existing) return existing;
        const circuit = new CircuitBreakerInstance(name, { ...DEFAULT_CIRCUIT_OPTIONS, ...options });
        this.circuits.set(name, circuit);
        return circuit;
    }

    async execute<T>(name: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T> {
        const circuit = this.getCircuitBreaker(name, options);
        if (!circuit.canExecute()) {
            throw new CircuitBreakerOpenError(name, circuit.getNextAttempt());
        }
        try {
            const result = await fn();
            circuit.recordSuccess();
            return result;
        } catch (error) {
            circuit.recordFailure();
            throw error;
        }
    }

    getAllStats(): CircuitBreakerStats[] {
        return [...this.circuits.values()].map(circuit => circuit.getStats());
    }

    reset(name: string): void {
        this.circuits.get(name)?.reset();
    }

    resetAll(): void {
        for (const circuit of this.circuits.values()) circuit.reset();
    }

    onModuleDestroy(): void {
        this.circuits.clear();
    }
}

export class CircuitBreakerInstance {
    private state = CircuitState.CLOSED;
    private failures = 0;
    private successes = 0;
    private lastFailure?: Date;
    private lastSuccess?: Date;
    private nextAttempt?: Date;

    constructor(
        private readonly circuitName: string,
        private readonly options: Required<CircuitBreakerOptions>,
    ) {}

    canExecute(): boolean {
        if (this.state === CircuitState.CLOSED) return true;
        if (this.state === CircuitState.HALF_OPEN) return true;
        if (this.nextAttempt && new Date() >= this.nextAttempt) {
            this.state = CircuitState.HALF_OPEN;
            this.successes = 0;
            return true;
        }
        return false;
    }

    recordSuccess(): void {
        this.lastSuccess = new Date();
        this.successes += 1;
        if (this.state === CircuitState.HALF_OPEN && this.successes >= this.options.successThreshold) {
            this.reset();
        }
    }

    recordFailure(): void {
        this.lastFailure = new Date();
        this.failures += 1;
        if (this.state === CircuitState.HALF_OPEN || this.failures >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
            this.successes = 0;
        }
    }

    getStats(): CircuitBreakerStats {
        return {
            name: this.options.name || this.circuitName,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            nextAttempt: this.nextAttempt,
        };
    }

    getNextAttempt(): Date | undefined {
        return this.nextAttempt;
    }

    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = undefined;
        this.lastSuccess = undefined;
        this.nextAttempt = undefined;
    }
}

export class CircuitBreakerOpenError extends Error {
    constructor(
        public readonly circuitName: string,
        public readonly nextAttempt?: Date,
    ) {
        super(`Circuit breaker '${circuitName}' is open. Next attempt: ${nextAttempt?.toISOString() ?? 'unknown'}`);
        this.name = 'CircuitBreakerOpenError';
    }
}

export const CIRCUIT_BREAKER_OPTIONS = 'resilience:circuit_breaker_options';
export const CircuitBreaker = (options: CircuitBreakerOptions) => SetMetadata(CIRCUIT_BREAKER_OPTIONS, options);

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly circuitBreakers: CircuitBreakerService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const options = this.reflector.getAllAndOverride<CircuitBreakerOptions | undefined>(CIRCUIT_BREAKER_OPTIONS, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!options) return next.handle();
        const name = options.name || `${context.getClass().name}.${context.getHandler().name}`;
        return from(this.circuitBreakers.execute(name, () => lastValueFrom(next.handle()), options));
    }
}

export interface CacheOptions {
    ttl?: number;
    prefix?: string;
    touch?: boolean;
}

export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
}

export interface CacheDecoratorOptions extends CacheOptions {
    keyPrefix?: string;
    skipOnError?: boolean;
}

const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
    ttl: 300,
    prefix: 'cache',
    touch: false,
};

@Injectable()
export class CacheService implements OnModuleDestroy {
    private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

    constructor(private readonly redis: RedissonService) {}

    async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const fullKey = this.buildKey(key, options);
        const data = await this.redis.get(fullKey);
        if (!data) {
            this.stats.misses += 1;
            return null;
        }
        this.stats.hits += 1;
        if (options?.touch) {
            await this.redis.expire(fullKey, options.ttl ?? DEFAULT_CACHE_OPTIONS.ttl);
        }
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as T;
        }
    }

    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
        await this.redis.set(
            this.buildKey(key, options),
            typeof value === 'string' ? value : JSON.stringify(value),
            ttl,
        );
        this.stats.sets += 1;
    }

    async delete(key: string, options?: CacheOptions): Promise<void> {
        await this.redis.delete(this.buildKey(key, options));
        this.stats.deletes += 1;
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        const cached = await this.get<T>(key, options);
        if (cached !== null) return cached;
        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return { ...this.stats, hitRate: total > 0 ? this.stats.hits / total : 0 };
    }

    resetStats(): void {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    onModuleDestroy(): void {
        this.resetStats();
    }

    private buildKey(key: string, options?: CacheOptions): string {
        return `cache:${options?.prefix ?? DEFAULT_CACHE_OPTIONS.prefix}:${key}`;
    }
}

export const CACHE_KEY = 'resilience:cache_options';
export const Cache = (options: CacheDecoratorOptions) => SetMetadata(CACHE_KEY, options);
export const CachePrefix = (prefix: string) => SetMetadata(CACHE_KEY, { prefix });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const cacheOptions = this.reflector.getAllAndOverride<CacheDecoratorOptions | undefined>(CACHE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!cacheOptions) return next.handle();

        const cacheKey = this.buildCacheKey(context, cacheOptions);
        const cached = await this.cacheService.get(cacheKey, cacheOptions);
        if (cached !== null) return of(cached);

        return next.handle().pipe(
            tap(async result => {
                if (result !== undefined && result !== null) {
                    await this.cacheService.set(cacheKey, result, cacheOptions);
                }
            }),
        );
    }

    private buildCacheKey(context: ExecutionContext, options: CacheDecoratorOptions): string {
        const request = context.switchToHttp().getRequest<Request>();
        const prefix = options.keyPrefix ?? `${context.getClass().name}:${context.getHandler().name}`;
        return `${prefix}:${JSON.stringify(request.params ?? {})}`;
    }
}

export class TtlCache<T> {
    private readonly store = new Map<string, { at: number; value: T }>();
    private readonly inflight = new Map<string, Promise<T>>();

    constructor(
        private readonly ttlMs: number,
        private readonly maxKeys = 256,
    ) {}

    get(key: string): T | undefined {
        const hit = this.store.get(key);
        if (!hit) return undefined;
        if (Date.now() - hit.at >= this.ttlMs) {
            this.store.delete(key);
            return undefined;
        }
        return hit.value;
    }

    set(key: string, value: T): void {
        this.store.set(key, { at: Date.now(), value });
        if (this.store.size > this.maxKeys) {
            const oldest = [...this.store.entries()].sort((left, right) => left[1].at - right[1].at)[0]?.[0];
            if (oldest) this.store.delete(oldest);
        }
    }

    async getOrLoad(key: string, factory: () => Promise<T>): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) return cached;
        const pending = this.inflight.get(key);
        if (pending) return pending;
        const promise = factory()
            .then(value => {
                this.set(key, value);
                return value;
            })
            .finally(() => this.inflight.delete(key));
        this.inflight.set(key, promise);
        return promise;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
        this.inflight.clear();
    }
}

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

export interface DistributedLockOptions {
    key: string;
    waitTime?: number;
    leaseTime?: number;
    watchdog?: boolean;
    prefix?: string;
}

export interface LockOptions {
    waitTime?: number;
    leaseTime?: number;
    watchdog?: boolean;
}

export interface LockResult<T> {
    success: boolean;
    value?: T;
    error?: Error;
}

@Injectable()
export class DistributedLockService {
    private readonly logger = new Logger(DistributedLockService.name);

    constructor(private readonly redisson: RedissonService) {}

    async withLock<T>(key: string, callback: () => Promise<T> | T, options: LockOptions = {}): Promise<LockResult<T>> {
        const waitTime = options.waitTime ?? 5000;
        const leaseTime = options.leaseTime ?? 30000;
        const lockKey = `lock:${key}`;
        const lock = this.redisson.getLock(lockKey) as LockLike;
        let acquired = false;

        try {
            acquired = await lock.tryLock(waitTime, options.watchdog ? true : leaseTime);
            if (!acquired) {
                return { success: false, error: new Error(`Failed to acquire lock: ${lockKey}`) };
            }
            return { success: true, value: await callback() };
        } catch (error) {
            this.logger.error(`Error during locked operation: ${lockKey}`, error);
            return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
        } finally {
            if (acquired) {
                try {
                    if (await lock.isLocked()) await lock.unlock();
                } catch (error) {
                    this.logger.error(`Error releasing lock: ${lockKey}`, error);
                }
            }
        }
    }
}

interface LockLike {
    tryLock(waitTime: number, leaseTime: number | true): Promise<boolean>;
    isLocked(): Promise<boolean>;
    unlock(): Promise<void>;
}

export const DISTRIBUTED_LOCK_KEY = 'resilience:distributed_lock';
export const DistributedLock = (options: DistributedLockOptions) => SetMetadata(DISTRIBUTED_LOCK_KEY, options);

@Injectable()
export class DistributedLockInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly lockService: DistributedLockService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const lockOptions = this.reflector.getAllAndOverride<DistributedLockOptions | undefined>(DISTRIBUTED_LOCK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!lockOptions) return next.handle();

        const request = context.switchToHttp().getRequest<Request>();
        const lockKey = this.resolveLockKey(lockOptions, request);

        return from(
            this.lockService.withLock(lockKey, () => lastValueFrom(next.handle()), {
                waitTime: lockOptions.waitTime,
                leaseTime: lockOptions.leaseTime,
                watchdog: lockOptions.watchdog,
            }),
        ).pipe(
            mergeMap(result => {
                if (!result.success) {
                    return throwError(() => result.error ?? new Error(`Failed to acquire lock: ${lockKey}`));
                }
                return of(result.value);
            }),
        );
    }

    private resolveLockKey(options: DistributedLockOptions, request: Request): string {
        const base = options.key
            .replace(/\{\{body\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.body)[field] ?? ''))
            .replace(/\{\{params\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.params)[field] ?? ''))
            .replace(/\{\{query\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.query)[field] ?? ''));
        return options.prefix ? `${options.prefix}:${base}` : base;
    }
}

function readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@Module({})
export class ResilienceModule {
    static register(options: { globalInterceptors?: boolean } = { globalInterceptors: true }): DynamicModule {
        const interceptorProviders =
            options.globalInterceptors === false
                ? []
                : [
                      { provide: APP_INTERCEPTOR, useClass: RetryInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CircuitBreakerInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
                      { provide: APP_INTERCEPTOR, useClass: DistributedLockInterceptor },
                  ];
        const providers = [
            RetryService,
            RetryInterceptor,
            CircuitBreakerService,
            CircuitBreakerInterceptor,
            CacheService,
            CacheInterceptor,
            RateLimitingService,
            RateLimitingGuard,
            DistributedLockService,
            DistributedLockInterceptor,
            ...interceptorProviders,
        ];
        return {
            module: ResilienceModule,
            global: true,
            providers,
            exports: [
                RetryService,
                CircuitBreakerService,
                CacheService,
                RateLimitingService,
                RateLimitingGuard,
                DistributedLockService,
            ],
        };
    }
}
