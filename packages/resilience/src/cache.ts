import { createHash } from 'node:crypto';
import { RedissonService } from '@a3s-lab/redisson';
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
    OnModuleDestroy,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { catchError, concatMap, defer, type Observable, of, throwError } from 'rxjs';
import { readRecord } from './utils';

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
    /**
     * Private caches vary by authenticated identity and credentials. Public
     * caches deliberately share responses between users, while still varying
     * by tenant, route inputs, and representation headers.
     */
    scope?: 'private' | 'public';
    /** Additional request headers that influence the representation. */
    varyByHeaders?: string[];
    /**
     * When true (the default), cache backend failures bypass the cache instead
     * of failing an otherwise successful request.
     */
    skipOnError?: boolean;
}

const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
    ttl: 300,
    prefix: 'cache',
    touch: false,
};

const CACHE_VALUE_PREFIX = '\u0000nestify-cache:v1:';

export class CacheServiceClosedError extends Error {
    constructor() {
        super('CacheService is shutting down and cannot start new operations');
        this.name = 'CacheServiceClosedError';
    }
}

@Injectable()
export class CacheService implements OnModuleDestroy {
    private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    private readonly inFlight = new Set<Promise<unknown>>();
    private shutdownPromise?: Promise<void>;
    private shuttingDown = false;

    constructor(private readonly redis: RedissonService) {}

    get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        return this.execute(() => this.getValue<T>(key, options));
    }

    private async getValue<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const fullKey = this.buildKey(key, options);
        const data = await this.redis.get(fullKey);
        if (data === null) {
            this.stats.misses += 1;
            return null;
        }
        const value = deserializeCacheValue<T>(data);
        if (options?.touch) {
            await this.redis.expire(fullKey, options.ttl ?? DEFAULT_CACHE_OPTIONS.ttl);
        }
        this.stats.hits += 1;
        return value;
    }

    set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        return this.execute(() => this.setValue(key, value, options));
    }

    private async setValue<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
        await this.redis.set(this.buildKey(key, options), serializeCacheValue(value), ttl);
        this.stats.sets += 1;
    }

    delete(key: string, options?: CacheOptions): Promise<void> {
        return this.execute(() => this.deleteValue(key, options));
    }

    private async deleteValue(key: string, options?: CacheOptions): Promise<void> {
        await this.redis.delete(this.buildKey(key, options));
        this.stats.deletes += 1;
    }

    getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        return this.execute(() => this.loadValue(key, factory, options));
    }

    private async loadValue<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        const cached = await this.getValue<T>(key, options);
        if (cached !== null) return cached;
        const value = await factory();
        await this.setValue(key, value, options);
        return value;
    }

    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return { ...this.stats, hitRate: total > 0 ? this.stats.hits / total : 0 };
    }

    resetStats(): void {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    onModuleDestroy(): Promise<void> {
        if (!this.shutdownPromise) {
            this.shuttingDown = true;
            const inFlight = [...this.inFlight];
            this.shutdownPromise = Promise.allSettled(inFlight).then(() => {
                this.resetStats();
            });
        }
        return this.shutdownPromise;
    }

    private buildKey(key: string, options?: CacheOptions): string {
        return `cache:${options?.prefix ?? DEFAULT_CACHE_OPTIONS.prefix}:${key}`;
    }

    private execute<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
        if (this.shuttingDown) {
            return Promise.reject(new CacheServiceClosedError());
        }
        const pending = Promise.resolve().then(operation);
        this.inFlight.add(pending);
        void pending.then(
            () => this.inFlight.delete(pending),
            () => this.inFlight.delete(pending),
        );
        return pending;
    }
}

function serializeCacheValue(value: unknown): string {
    if (value === undefined) {
        throw new TypeError('Cache value cannot be undefined');
    }
    const serialized = JSON.stringify({ value });
    if (serialized === undefined) {
        throw new TypeError('Cache value cannot be serialized');
    }
    return `${CACHE_VALUE_PREFIX}${serialized}`;
}

function deserializeCacheValue<T>(data: string): T {
    if (data.startsWith(CACHE_VALUE_PREFIX)) {
        const envelope = JSON.parse(data.slice(CACHE_VALUE_PREFIX.length)) as unknown;
        if (
            envelope === null ||
            typeof envelope !== 'object' ||
            Object.getOwnPropertyDescriptor(envelope, 'value') === undefined
        ) {
            throw new TypeError('Cached value envelope is invalid');
        }
        return (envelope as { value: T }).value;
    }
    try {
        return JSON.parse(data) as T;
    } catch {
        return data as T;
    }
}

export const CACHE_KEY = 'resilience:cache_options';
export const Cache = (options: CacheDecoratorOptions) => SetMetadata(CACHE_KEY, options);
export const CachePrefix = (prefix: string) => SetMetadata(CACHE_KEY, { prefix });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CacheInterceptor.name);

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

        const skipOnError = cacheOptions.skipOnError ?? true;
        let cacheKey: string;
        try {
            cacheKey = this.buildCacheKey(context, cacheOptions);
        } catch (error) {
            if (!skipOnError) throw error;
            this.warnCacheFailure('key generation');
            return next.handle();
        }
        let cached: unknown;
        try {
            cached = await this.cacheService.get(cacheKey, cacheOptions);
        } catch (error) {
            if (!skipOnError) throw error;
            this.warnCacheFailure('read');
            return next.handle();
        }
        if (cached !== null) return of(cached);

        return next.handle().pipe(
            concatMap(result => {
                if (result === undefined || result === null) return of(result);

                return defer(() => this.cacheService.set(cacheKey, result, cacheOptions)).pipe(
                    concatMap(() => of(result)),
                    catchError(error => {
                        if (!skipOnError) return throwError(() => error);
                        this.warnCacheFailure('write');
                        return of(result);
                    }),
                );
            }),
        );
    }

    private buildCacheKey(context: ExecutionContext, options: CacheDecoratorOptions): string {
        const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>();
        const prefix = options.keyPrefix ?? `${context.getClass().name}:${context.getHandler().name}`;
        const headers = normalizeHeaders(request.headers, [
            'accept',
            'accept-language',
            'content-type',
            'host',
            'x-forwarded-host',
            'x-forwarded-proto',
            'x-tenant-id',
            ...(options.scope === 'public' ? [] : ['authorization', 'cookie', 'x-api-key']),
            ...(options.varyByHeaders ?? []),
        ]);
        const route = readRecord(request.route);
        const user = readRecord(request.user);
        const auth = readRecord(request.auth);
        const tenant =
            request.tenant ??
            request.tenantId ??
            request.organizationId ??
            user.tenant ??
            user.tenantId ??
            user.organizationId ??
            auth.tenant ??
            auth.tenantId ??
            auth.organizationId ??
            headers['x-tenant-id'] ??
            null;
        const identity =
            options.scope === 'public'
                ? undefined
                : {
                      user: request.user ?? null,
                      userId: user.id ?? user.userId ?? user.sub ?? null,
                      auth: request.auth ?? null,
                      authSubject: auth.id ?? auth.userId ?? auth.sub ?? null,
                      principal: request.principal ?? null,
                      sessionId: request.sessionID ?? readRecord(request.session).id ?? null,
                      credentials: {
                          authorization: headers.authorization ?? null,
                          cookie: headers.cookie ?? null,
                          apiKey: headers['x-api-key'] ?? null,
                      },
                  };
        const digest = createHash('sha256')
            .update(
                stableStringify({
                    method: request.method?.toUpperCase() ?? '',
                    baseUrl: request.baseUrl ?? '',
                    routePath: route.path ?? '',
                    path: request.path ?? request.originalUrl?.split('?')[0] ?? request.url?.split('?')[0] ?? '',
                    params: request.params ?? {},
                    query: request.query ?? {},
                    body: request.body ?? null,
                    headers,
                    tenant,
                    identity,
                }),
            )
            .digest('hex');

        return `${prefix}:v2:${digest}`;
    }

    private warnCacheFailure(operation: 'key generation' | 'read' | 'write'): void {
        this.logger.warn(`Cache ${operation} failed; bypassing cache`);
    }
}

function normalizeHeaders(headers: Request['headers'] | undefined, names: string[]): Record<string, string> {
    const requested = new Set(names.map(normalizeHeaderName).filter(name => name.length > 0));
    const normalized = Object.create(null) as Record<string, string>;
    for (const [originalName, value] of Object.entries(headers ?? {})) {
        const name = normalizeHeaderName(originalName);
        if (!requested.has(name) || value === undefined) continue;
        const normalizedValue = (Array.isArray(value) ? value.join(',') : String(value)).trim();
        normalized[name] = normalized[name] ? `${normalized[name]},${normalizedValue}` : normalizedValue;
    }
    return normalized;
}

function normalizeHeaderName(name: string): string {
    return name.trim().toLowerCase();
}

function stableStringify(value: unknown): string {
    const references = new WeakMap<object, number>();
    let nextReference = 0;

    const serialize = (current: unknown): string => {
        if (current === null) return 'null';
        switch (typeof current) {
            case 'undefined':
                return 'undefined';
            case 'boolean':
                return `boolean:${current ? 'true' : 'false'}`;
            case 'string':
                return `string:${JSON.stringify(current)}`;
            case 'number':
                if (Number.isNaN(current)) return 'number:NaN';
                if (current === Number.POSITIVE_INFINITY) return 'number:Infinity';
                if (current === Number.NEGATIVE_INFINITY) return 'number:-Infinity';
                if (Object.is(current, -0)) return 'number:-0';
                return `number:${current}`;
            case 'bigint':
                return `bigint:${current}`;
            case 'symbol':
            case 'function':
                throw new TypeError('Cache key contains an unsupported value');
        }

        const existingReference = references.get(current);
        if (existingReference !== undefined) return `reference:${existingReference}`;
        const reference = nextReference;
        nextReference += 1;
        references.set(current, reference);

        if (current instanceof Date) {
            const timestamp = current.getTime();
            return `date:${reference}:${Number.isNaN(timestamp) ? 'invalid' : current.toISOString()}`;
        }
        if (current instanceof RegExp) {
            return `regexp:${reference}:${JSON.stringify(current.source)}:${current.flags}`;
        }
        if (current instanceof URL) {
            return `url:${reference}:${JSON.stringify(current.href)}`;
        }
        if (ArrayBuffer.isView(current)) {
            const bytes = Buffer.from(current.buffer, current.byteOffset, current.byteLength).toString('base64');
            return `view:${reference}:${current.constructor.name}:${bytes}`;
        }
        if (current instanceof ArrayBuffer) {
            return `buffer:${reference}:${Buffer.from(current).toString('base64')}`;
        }
        if (Array.isArray(current)) {
            return `array:${reference}:[${current.map(item => serialize(item)).join(',')}]`;
        }
        if (current instanceof Map) {
            return `map:${reference}:[${[...current].map(([key, item]) => `${serialize(key)}=>${serialize(item)}`).join(',')}]`;
        }
        if (current instanceof Set) {
            return `set:${reference}:[${[...current].map(item => serialize(item)).join(',')}]`;
        }

        const symbols = Object.getOwnPropertySymbols(current).filter(symbol =>
            Object.prototype.propertyIsEnumerable.call(current, symbol),
        );
        if (symbols.length > 0) {
            throw new TypeError('Cache key contains unsupported symbol properties');
        }
        const record = current as Record<string, unknown>;
        const prototype = Object.getPrototypeOf(current) as { constructor?: { name?: unknown } } | null;
        const constructorName = typeof prototype?.constructor?.name === 'string' ? prototype.constructor.name : '';
        const properties = Object.getOwnPropertyNames(record)
            .sort()
            .map(key => `${JSON.stringify(key)}:${serialize(record[key])}`)
            .join(',');
        return `object:${reference}:${JSON.stringify(constructorName)}:{${properties}}`;
    };

    return serialize(value);
}

export class TtlCache<T> {
    private readonly store = new Map<string, { at: number; value: T }>();
    private readonly inflight = new Map<string, Promise<T>>();
    private readonly revisions = new Map<string, number>();
    private readonly pendingLoads = new Map<string, number>();
    private generation = 0;

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
        this.invalidatePending(key);
        this.storeValue(key, value);
    }

    private storeValue(key: string, value: T): void {
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
        const generation = this.generation;
        const revision = this.revisions.get(key) ?? 0;
        this.pendingLoads.set(key, (this.pendingLoads.get(key) ?? 0) + 1);
        const promise = Promise.resolve()
            .then(factory)
            .then(value => {
                if (generation === this.generation && revision === (this.revisions.get(key) ?? 0)) {
                    this.storeValue(key, value);
                }
                return value;
            })
            .finally(() => {
                if (this.inflight.get(key) === promise) {
                    this.inflight.delete(key);
                }
                const remaining = (this.pendingLoads.get(key) ?? 1) - 1;
                if (remaining > 0) {
                    this.pendingLoads.set(key, remaining);
                } else {
                    this.pendingLoads.delete(key);
                    this.revisions.delete(key);
                }
            });
        this.inflight.set(key, promise);
        return promise;
    }

    delete(key: string): void {
        this.invalidatePending(key);
        this.store.delete(key);
    }

    clear(): void {
        this.generation += 1;
        this.store.clear();
        this.inflight.clear();
        this.revisions.clear();
    }

    private bumpRevision(key: string): void {
        this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
    }

    private invalidatePending(key: string): void {
        if ((this.pendingLoads.get(key) ?? 0) > 0) {
            this.bumpRevision(key);
        }
        this.inflight.delete(key);
    }
}
