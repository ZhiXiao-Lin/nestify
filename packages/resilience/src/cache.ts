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
const MAX_CACHE_KEY_LENGTH = 1_024;
const MAX_CACHE_PREFIX_LENGTH = 128;
const MAX_CACHE_TTL_SECONDS = 2_147_483_647;

interface NormalizedCacheOptions {
    readonly ttl: number;
    readonly prefix: string;
    readonly touch: boolean;
}

interface CacheLookup<T> {
    readonly hit: boolean;
    readonly value?: T;
}

interface CacheLoadState {
    revision: number;
    pending: number;
}

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
    private readonly loads = new Map<string, Promise<unknown>>();
    private readonly loadStates = new Map<string, CacheLoadState>();
    private shutdownPromise?: Promise<void>;
    private shuttingDown = false;

    constructor(private readonly redis: RedissonService) {}

    get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        return this.execute(() => this.getValue<T>(key, options));
    }

    private async getValue<T>(key: string, options?: CacheOptions): Promise<T | null> {
        const entry = this.resolveEntry(key, options);
        const lookup = await this.lookupValue<T>(entry.key, entry.options);
        return lookup.hit ? (lookup.value as T) : null;
    }

    private async lookupValue<T>(fullKey: string, options: NormalizedCacheOptions): Promise<CacheLookup<T>> {
        const data = await this.redis.get(fullKey);
        if (data === null) {
            this.stats.misses += 1;
            return { hit: false };
        }
        const value = deserializeCacheValue<T>(data);
        if (options.touch) {
            await this.redis.expire(fullKey, options.ttl);
        }
        this.stats.hits += 1;
        return { hit: true, value };
    }

    set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        return this.execute(() => {
            const entry = this.resolveEntry(key, options);
            this.invalidatePendingLoad(entry.key);
            return this.writeValue(entry.key, value, entry.options);
        });
    }

    private async writeValue<T>(fullKey: string, value: T, options: NormalizedCacheOptions): Promise<void> {
        await this.redis.set(fullKey, serializeCacheValue(value), options.ttl);
        this.stats.sets += 1;
    }

    delete(key: string, options?: CacheOptions): Promise<void> {
        return this.execute(async () => {
            const entry = this.resolveEntry(key, options);
            this.invalidatePendingLoad(entry.key);
            await this.redis.delete(entry.key);
            this.stats.deletes += 1;
        });
    }

    getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        return this.execute(() => this.loadValue(key, factory, options));
    }

    private async loadValue<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T> {
        if (typeof factory !== 'function') throw new TypeError('cache factory must be a function');
        const entry = this.resolveEntry(key, options);
        const existing = this.loads.get(entry.key);
        if (existing) return existing as Promise<T>;

        const state = this.startLoad(entry.key);
        const revision = state.revision;
        const promise = this.loadEntry<T>(entry.key, entry.options, factory, state, revision).finally(() => {
            if (this.loads.get(entry.key) === promise) this.loads.delete(entry.key);
            state.pending -= 1;
            if (state.pending === 0) this.loadStates.delete(entry.key);
        });
        this.loads.set(entry.key, promise);
        return promise;
    }

    private async loadEntry<T>(
        fullKey: string,
        options: NormalizedCacheOptions,
        factory: () => Promise<T>,
        state: CacheLoadState,
        revision: number,
    ): Promise<T> {
        const cached = await this.lookupValue<T>(fullKey, options);
        if (cached.hit) return cached.value as T;
        const value = await factory();
        if (state.revision === revision) await this.writeValue(fullKey, value, options);
        return value;
    }

    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return Object.freeze({ ...this.stats, hitRate: total > 0 ? this.stats.hits / total : 0 });
    }

    resetStats(): void {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    onModuleDestroy(): Promise<void> {
        return this.shutdown();
    }

    /** Stop accepting new operations and drain every cache operation that already started. */
    shutdown(): Promise<void> {
        if (!this.shutdownPromise) {
            this.shuttingDown = true;
            const inFlight = [...this.inFlight];
            this.shutdownPromise = Promise.allSettled(inFlight).then(() => {
                this.loads.clear();
                this.loadStates.clear();
                this.resetStats();
            });
        }
        return this.shutdownPromise;
    }

    get isClosed(): boolean {
        return this.shuttingDown;
    }

    private resolveEntry(key: string, options?: CacheOptions): { key: string; options: NormalizedCacheOptions } {
        const normalizedKey = validateCacheKey(key);
        const normalizedOptions = normalizeCacheOptions(options);
        return {
            key: `cache:${normalizedOptions.prefix}:${normalizedKey}`,
            options: normalizedOptions,
        };
    }

    private startLoad(key: string): CacheLoadState {
        const state = this.loadStates.get(key) ?? { revision: 0, pending: 0 };
        state.pending += 1;
        this.loadStates.set(key, state);
        return state;
    }

    private invalidatePendingLoad(key: string): void {
        const state = this.loadStates.get(key);
        if (state) state.revision = safeIncrement(state.revision);
        this.loads.delete(key);
    }

    private execute<TResult>(operation: () => TResult | Promise<TResult>): Promise<TResult> {
        if (this.shuttingDown) {
            return Promise.reject(new CacheServiceClosedError());
        }
        let pending: Promise<TResult>;
        try {
            pending = Promise.resolve(operation());
        } catch (error) {
            pending = Promise.reject(error);
        }
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
    const envelope = JSON.parse(serialized) as unknown;
    if (
        envelope === null ||
        typeof envelope !== 'object' ||
        Object.getOwnPropertyDescriptor(envelope, 'value') === undefined
    ) {
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

function normalizeCacheOptions(options: CacheOptions | undefined): NormalizedCacheOptions {
    if (options !== undefined && (!options || typeof options !== 'object')) {
        throw new TypeError('cache options must be an object');
    }
    const ttl = options?.ttl ?? DEFAULT_CACHE_OPTIONS.ttl;
    if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > MAX_CACHE_TTL_SECONDS) {
        throw new RangeError(`cache ttl must be a positive safe integer no greater than ${MAX_CACHE_TTL_SECONDS}`);
    }
    const prefix = options?.prefix ?? DEFAULT_CACHE_OPTIONS.prefix;
    if (typeof prefix !== 'string' || !prefix.trim()) throw new TypeError('cache prefix must not be empty');
    const normalizedPrefix = prefix.trim();
    if (normalizedPrefix.length > MAX_CACHE_PREFIX_LENGTH) {
        throw new RangeError(`cache prefix cannot exceed ${MAX_CACHE_PREFIX_LENGTH} characters`);
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/u.test(normalizedPrefix)) {
        throw new TypeError('cache prefix may contain only letters, digits, colons, underscores, and hyphens');
    }
    const touch = options?.touch ?? DEFAULT_CACHE_OPTIONS.touch;
    if (typeof touch !== 'boolean') throw new TypeError('cache touch must be a boolean');
    return Object.freeze({ ttl, prefix: normalizedPrefix, touch });
}

function validateCacheKey(key: string): string {
    if (typeof key !== 'string' || !key.trim()) throw new TypeError('cache key must not be empty');
    if (key.length > MAX_CACHE_KEY_LENGTH) {
        throw new RangeError(`cache key cannot exceed ${MAX_CACHE_KEY_LENGTH} characters`);
    }
    if (/[\u0000-\u001f\u007f]/u.test(key)) throw new TypeError('cache key cannot contain control characters');
    return key;
}

function safeIncrement(value: number): number {
    return Math.min(Number.MAX_SAFE_INTEGER, value + 1);
}

export const CACHE_KEY = 'resilience:cache_options';
export const Cache = (options: CacheDecoratorOptions) =>
    SetMetadata(CACHE_KEY, normalizeCacheDecoratorOptions(options));
export const CachePrefix = (prefix: string) => Cache({ prefix });

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CacheInterceptor.name);

    constructor(
        private readonly cacheService: CacheService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const configuredOptions = this.reflector.getAllAndOverride<CacheDecoratorOptions | undefined>(CACHE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!configuredOptions) return next.handle();
        const cacheOptions = normalizeCacheDecoratorOptions(configuredOptions);

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

function normalizeCacheDecoratorOptions(options: CacheDecoratorOptions): CacheDecoratorOptions {
    if (!options || typeof options !== 'object') throw new TypeError('cache decorator options must be an object');
    const cacheOptions = normalizeCacheOptions(options);
    const scope = options.scope ?? 'private';
    if (scope !== 'private' && scope !== 'public') throw new TypeError('cache scope must be private or public');
    const skipOnError = options.skipOnError ?? true;
    if (typeof skipOnError !== 'boolean') throw new TypeError('cache skipOnError must be a boolean');
    const keyPrefix = options.keyPrefix === undefined ? undefined : normalizeCacheKeyPrefix(options.keyPrefix);
    if (options.varyByHeaders !== undefined && !Array.isArray(options.varyByHeaders)) {
        throw new TypeError('cache varyByHeaders must be an array');
    }
    const varyByHeaders = options.varyByHeaders?.map(header => {
        if (typeof header !== 'string' || !normalizeHeaderName(header)) {
            throw new TypeError('cache varyByHeaders must contain non-empty header names');
        }
        return normalizeHeaderName(header);
    });
    return Object.freeze({
        ...cacheOptions,
        scope,
        skipOnError,
        ...(keyPrefix === undefined ? {} : { keyPrefix }),
        ...(varyByHeaders === undefined ? {} : { varyByHeaders: Object.freeze(varyByHeaders) as string[] }),
    });
}

function normalizeCacheKeyPrefix(prefix: string): string {
    if (typeof prefix !== 'string' || !prefix.trim()) throw new TypeError('cache keyPrefix must not be empty');
    const normalized = prefix.trim();
    if (normalized.length > MAX_CACHE_KEY_LENGTH) {
        throw new RangeError(`cache keyPrefix cannot exceed ${MAX_CACHE_KEY_LENGTH} characters`);
    }
    if (/[\u0000-\u001f\u007f]/u.test(normalized)) {
        throw new TypeError('cache keyPrefix cannot contain control characters');
    }
    return normalized;
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
    let nodes = 0;
    let materialSize = 0;

    const consumeMaterial = (size: number): void => {
        materialSize += size;
        if (materialSize > 1_000_000) throw new RangeError('Cache key material is too large');
    };

    const serialize = (current: unknown, depth = 0): string => {
        nodes += 1;
        if (nodes > 10_000) throw new RangeError('Cache key material has too many values');
        if (depth > 32) throw new RangeError('Cache key material is nested too deeply');
        if (current === null) return 'null';
        switch (typeof current) {
            case 'undefined':
                return 'undefined';
            case 'boolean':
                return `boolean:${current ? 'true' : 'false'}`;
            case 'string':
                consumeMaterial(current.length);
                return `string:${JSON.stringify(current)}`;
            case 'number':
                if (Number.isNaN(current)) return 'number:NaN';
                if (current === Number.POSITIVE_INFINITY) return 'number:Infinity';
                if (current === Number.NEGATIVE_INFINITY) return 'number:-Infinity';
                if (Object.is(current, -0)) return 'number:-0';
                return `number:${current}`;
            case 'bigint':
                consumeMaterial(current.toString().length);
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
            consumeMaterial(current.source.length + current.flags.length);
            return `regexp:${reference}:${JSON.stringify(current.source)}:${current.flags}`;
        }
        if (current instanceof URL) {
            consumeMaterial(current.href.length);
            return `url:${reference}:${JSON.stringify(current.href)}`;
        }
        if (ArrayBuffer.isView(current)) {
            consumeMaterial(current.byteLength);
            const bytes = Buffer.from(current.buffer, current.byteOffset, current.byteLength).toString('base64');
            return `view:${reference}:${current.constructor.name}:${bytes}`;
        }
        if (current instanceof ArrayBuffer) {
            consumeMaterial(current.byteLength);
            return `buffer:${reference}:${Buffer.from(current).toString('base64')}`;
        }
        if (Array.isArray(current)) {
            return `array:${reference}:[${current.map(item => serialize(item, depth + 1)).join(',')}]`;
        }
        if (current instanceof Map) {
            return `map:${reference}:[${[...current]
                .map(([key, item]) => `${serialize(key, depth + 1)}=>${serialize(item, depth + 1)}`)
                .join(',')}]`;
        }
        if (current instanceof Set) {
            return `set:${reference}:[${[...current].map(item => serialize(item, depth + 1)).join(',')}]`;
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
            .map(key => {
                consumeMaterial(key.length);
                return `${JSON.stringify(key)}:${serialize(record[key], depth + 1)}`;
            })
            .join(',');
        consumeMaterial(constructorName.length);
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

    private readonly ttlMs: number;
    private readonly maxKeys: number;

    constructor(ttlMs: number, maxKeys = 256) {
        if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) throw new RangeError('ttlMs must be a positive safe integer');
        if (!Number.isSafeInteger(maxKeys) || maxKeys < 1) {
            throw new RangeError('maxKeys must be a positive safe integer');
        }
        this.ttlMs = ttlMs;
        this.maxKeys = maxKeys;
    }

    get(key: string): T | undefined {
        return this.lookup(key)?.value;
    }

    set(key: string, value: T): void {
        this.invalidatePending(key);
        this.storeValue(key, value);
    }

    private storeValue(key: string, value: T): void {
        this.store.delete(key);
        this.store.set(key, { at: Date.now(), value });
        this.pruneExpired();
        while (this.store.size > this.maxKeys) {
            const oldest = this.store.keys().next().value;
            if (oldest === undefined) break;
            this.store.delete(oldest);
        }
    }

    async getOrLoad(key: string, factory: () => Promise<T>): Promise<T> {
        const cached = this.lookup(key);
        if (cached) return cached.value;
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

    private lookup(key: string): { at: number; value: T } | undefined {
        const hit = this.store.get(key);
        if (!hit) return undefined;
        if (Date.now() - hit.at >= this.ttlMs) {
            this.store.delete(key);
            return undefined;
        }
        return hit;
    }

    private pruneExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now - entry.at >= this.ttlMs) this.store.delete(key);
        }
    }
}
