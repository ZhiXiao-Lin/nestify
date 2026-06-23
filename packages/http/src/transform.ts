import { CallHandler, ExecutionContext, Injectable, Module, NestInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformOptions {
    transformRequest?: boolean;
    transformResponse?: boolean;
    wrapperKey?: string;
    includeMetadata?: boolean;
}

export interface ResponseMetadata {
    timestamp: string;
    path: string;
    method: string;
    duration?: number;
    requestId?: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
    private readonly defaultOptions: Required<TransformOptions>;

    constructor(options: TransformOptions = {}) {
        this.defaultOptions = {
            transformRequest: options.transformRequest ?? true,
            transformResponse: options.transformResponse ?? true,
            wrapperKey: options.wrapperKey ?? 'data',
            includeMetadata: options.includeMetadata ?? true,
        };
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const startTime = process.hrtime.bigint();
        const request = context.switchToHttp().getRequest<Request>();

        if (!this.defaultOptions.transformResponse) {
            return next.handle();
        }

        return next.handle().pipe(
            map(data => {
                const metadata = this.buildMetadata(request, this.getDuration(startTime));
                if (this.isWrappedResponse(data)) {
                    return this.defaultOptions.includeMetadata ? { ...data, _meta: metadata } : data;
                }
                return this.wrapResponse(data, metadata);
            }),
        );
    }

    private buildMetadata(request: Request, duration: bigint): ResponseMetadata {
        return {
            timestamp: new Date().toISOString(),
            path: request.path,
            method: request.method,
            duration: Number(duration) / 1e6,
            requestId: getRequestId(request),
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

export function transformKeysToCamelCase<T>(input: T): T {
    return transformKeys(input, key => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()));
}

export function transformKeysToSnakeCase<T>(input: T): T {
    return transformKeys(input, key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
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
export class TransformModule {}

type MutableRequest = Request & {
    body?: unknown;
    query: Record<string, unknown>;
};

function transformKeys<T>(input: T, transformKey: (key: string) => string): T {
    if (Array.isArray(input)) {
        return input.map(item => transformKeys(item, transformKey)) as T;
    }

    if (!isPlainObject(input)) {
        return input;
    }

    const transformed = Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[transformKey(key)] = transformKeys(value, transformKey);
        return acc;
    }, {});

    return transformed as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function getRequestId(request: Request): string | undefined {
    const requestWithId = request as Request & { id?: unknown };
    return typeof requestWithId.id === 'string' ? requestWithId.id : firstHeaderValue(request.headers['x-request-id']);
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}
