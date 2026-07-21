import {
    type CallHandler,
    type DynamicModule,
    type ExecutionContext,
    type FactoryProvider,
    Inject,
    Injectable,
    Module,
    type ModuleMetadata,
    type NestInterceptor,
    Optional,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessException, StatusCode } from './exceptions';
import {
    getSafeRequestMethod,
    getSafeRequestPath,
    HttpConfigurationError,
    normalizePositiveInteger,
} from './http-boundary';
import { attachRequestIdHeader, getOrCreateRequestId } from './request-id';

export interface TransformOptions {
    /** @deprecated Request key conversion is owned by `KeyTransformInterceptor`. */
    transformRequest?: boolean;
    transformResponse?: boolean;
    wrapperKey?: string;
    includeMetadata?: boolean;
}

export interface TransformModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<TransformOptions>['useFactory'];
}

export interface KeyTransformOptions {
    maxDepth?: number;
    maxEntries?: number;
}

export interface ResponseMetadata {
    timestamp: string;
    path: string;
    method: string;
    duration?: number;
    requestId?: string;
}

export const TRANSFORM_OPTIONS = Symbol.for('@a3s-lab/http/transform-options');
export const DEFAULT_KEY_TRANSFORM_MAX_DEPTH = 32;
export const DEFAULT_KEY_TRANSFORM_MAX_ENTRIES = 10_000;

interface NormalizedTransformOptions {
    readonly transformRequest: boolean;
    readonly transformResponse: boolean;
    readonly wrapperKey: string;
    readonly includeMetadata: boolean;
}

interface NormalizedKeyTransformOptions {
    readonly maxDepth: number;
    readonly maxEntries: number;
}

export function createTransformOptions(options: TransformOptions = {}): NormalizedTransformOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new HttpConfigurationError('Transform options must be an object.');
    }
    for (const field of ['transformRequest', 'transformResponse', 'includeMetadata'] as const) {
        if (options[field] !== undefined && typeof options[field] !== 'boolean') {
            throw new HttpConfigurationError(`${field} must be a boolean.`);
        }
    }
    const wrapperKey = options.wrapperKey ?? 'data';
    if (typeof wrapperKey !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(wrapperKey)) {
        throw new HttpConfigurationError('wrapperKey must be a safe identifier containing at most 64 characters.');
    }
    if (['_meta', '__proto__', 'prototype', 'constructor'].includes(wrapperKey)) {
        throw new HttpConfigurationError('wrapperKey must not use a reserved object key.');
    }
    return Object.freeze({
        transformRequest: options.transformRequest ?? true,
        transformResponse: options.transformResponse ?? true,
        wrapperKey,
        includeMetadata: options.includeMetadata ?? true,
    });
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    private readonly defaultOptions: NormalizedTransformOptions;

    constructor(@Optional() @Inject(TRANSFORM_OPTIONS) options: TransformOptions = {}) {
        this.defaultOptions = createTransformOptions(options);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const startTime = process.hrtime.bigint();
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        if (!this.defaultOptions.transformResponse) {
            return next.handle();
        }

        return next.handle().pipe(
            map(data => {
                const metadata = this.buildMetadata(request, requestId, this.getDuration(startTime));
                if (this.isWrappedResponse(data)) {
                    return this.defaultOptions.includeMetadata ? { ...data, _meta: metadata } : data;
                }
                return this.wrapResponse(data, metadata);
            }),
        );
    }

    private buildMetadata(request: Request, requestId: string, duration: bigint): ResponseMetadata {
        return {
            timestamp: new Date().toISOString(),
            path: getSafeRequestPath(request),
            method: getSafeRequestMethod(request),
            duration: Number(duration) / 1e6,
            requestId,
        };
    }

    private wrapResponse(data: unknown, metadata: ResponseMetadata): Record<string, unknown> {
        const response: Record<string, unknown> = {
            [this.defaultOptions.wrapperKey]: data,
        };

        if (this.defaultOptions.includeMetadata) {
            response._meta = metadata;
        }

        return response;
    }

    private isWrappedResponse(value: unknown): value is Record<string, unknown> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const record = value as Record<string, unknown>;
        return (
            (record.items !== undefined && record.total !== undefined) ||
            record.data !== undefined ||
            record._meta !== undefined
        );
    }

    private getDuration(startTime: bigint): bigint {
        return process.hrtime.bigint() - startTime;
    }
}

export function transformKeysToCamelCase<T>(input: T, options?: KeyTransformOptions): T {
    return transformKeys(input, key => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), options);
}

export function transformKeysToSnakeCase<T>(input: T, options?: KeyTransformOptions): T {
    return transformKeys(input, key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), options);
}

@Injectable()
export class KeyTransformInterceptor implements NestInterceptor {
    constructor(private readonly toCamelCase: boolean = true) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<MutableRequest>();

        if (request.query) {
            request.query = this.toCamelCase
                ? transformKeysToCamelCase(request.query)
                : transformKeysToSnakeCase(request.query);
        }

        if (request.body && typeof request.body === 'object') {
            request.body = this.toCamelCase
                ? transformKeysToCamelCase(request.body)
                : transformKeysToSnakeCase(request.body);
        }

        return next.handle();
    }
}

@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor }],
})
export class TransformModule {
    static register(options: TransformOptions = {}): DynamicModule {
        return {
            module: TransformModule,
            providers: [{ provide: TRANSFORM_OPTIONS, useValue: createTransformOptions(options) }],
        };
    }

    static registerAsync(options: TransformModuleAsyncOptions): DynamicModule {
        if (!options || typeof options !== 'object' || typeof options.useFactory !== 'function') {
            throw new HttpConfigurationError('TransformModule.registerAsync requires a useFactory function.');
        }
        return {
            module: TransformModule,
            imports: options.imports,
            providers: [
                {
                    provide: TRANSFORM_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: Parameters<TransformModuleAsyncOptions['useFactory']>) =>
                        createTransformOptions(await options.useFactory(...args)),
                },
            ],
        };
    }
}

type MutableRequest = Request & {
    body?: unknown;
    query: Record<string, unknown>;
};

function transformKeys<T>(input: T, transformKey: (key: string) => string, options: KeyTransformOptions = {}): T {
    const normalized = normalizeKeyTransformOptions(options);
    const state: KeyTransformState = {
        active: new WeakSet<object>(),
        entries: 0,
        options: normalized,
    };
    return transformKeyValue(input, transformKey, state, 0) as T;
}

interface KeyTransformState {
    active: WeakSet<object>;
    entries: number;
    options: NormalizedKeyTransformOptions;
}

function transformKeyValue(
    input: unknown,
    transformKey: (key: string) => string,
    state: KeyTransformState,
    depth: number,
): unknown {
    if (depth > state.options.maxDepth) {
        throw keyTransformError('Key transform depth limit exceeded.');
    }
    if (Array.isArray(input)) {
        enterContainer(input, state);
        try {
            return input.map(item => {
                countEntry(state);
                return transformKeyValue(item, transformKey, state, depth + 1);
            });
        } finally {
            state.active.delete(input);
        }
    }
    if (!isPlainObject(input)) {
        return input;
    }

    enterContainer(input, state);
    try {
        const entries: Array<[string, unknown]> = [];
        const transformedKeys = new Set<string>();
        for (const [key, value] of Object.entries(input)) {
            countEntry(state);
            const transformedKey = transformKey(key);
            if (transformedKeys.has(transformedKey)) {
                throw keyTransformError('Key transformation produced a duplicate key.', {
                    key,
                    transformedKey,
                });
            }
            transformedKeys.add(transformedKey);
            entries.push([transformedKey, transformKeyValue(value, transformKey, state, depth + 1)]);
        }
        return Object.fromEntries(entries);
    } finally {
        state.active.delete(input);
    }
}

function enterContainer(value: object, state: KeyTransformState): void {
    if (state.active.has(value)) {
        throw keyTransformError('Circular structures cannot be transformed.');
    }
    state.active.add(value);
}

function countEntry(state: KeyTransformState): void {
    state.entries += 1;
    if (state.entries > state.options.maxEntries) {
        throw keyTransformError('Key transform entry limit exceeded.');
    }
}

function normalizeKeyTransformOptions(options: KeyTransformOptions): NormalizedKeyTransformOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new HttpConfigurationError('Key transform options must be an object.');
    }
    return Object.freeze({
        maxDepth: normalizePositiveInteger(options.maxDepth, 'maxDepth', DEFAULT_KEY_TRANSFORM_MAX_DEPTH, 1, 128),
        maxEntries: normalizePositiveInteger(
            options.maxEntries,
            'maxEntries',
            DEFAULT_KEY_TRANSFORM_MAX_ENTRIES,
            1,
            100_000,
        ),
    });
}

function keyTransformError(message: string, details?: Record<string, unknown>): BusinessException {
    return new BusinessException({
        code: StatusCode.VALIDATION_ERROR,
        message,
        details,
    });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
