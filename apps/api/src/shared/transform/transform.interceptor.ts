// ============================================================================
// Transform Interceptor - Global request/response transformation
// ============================================================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface TransformOptions {
    /** Enable request body transformation */
    transformRequest?: boolean;
    /** Enable response transformation */
    transformResponse?: boolean;
    /** Custom response wrapper key */
    wrapperKey?: string;
    /** Metadata to include in response */
    includeMetadata?: boolean;
}

/**
 * Metadata included in transformed responses
 */
export interface ResponseMetadata {
    timestamp: string;
    path: string;
    method: string;
    duration?: number;
    requestId?: string;
}

/**
 * Transform Interceptor - Wraps responses and optionally transforms requests
 */
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

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const startTime = process.hrtime.bigint();
        const request = context.switchToHttp().getRequest<Request>();

        if (!this.defaultOptions.transformResponse) {
            return next.handle();
        }

        return next.handle().pipe(
            map(data => {
                const duration = this.getDuration(startTime);
                const metadata = this.buildMetadata(request, duration);

                // If data is already wrapped or is a primitive, return as-is or wrap
                if (this.isPrimitive(data)) {
                    return this.wrapResponse(data, metadata);
                }

                // If data has its own structure (e.g., PaginatedResponse), merge metadata
                if (this.isWrappedResponse(data)) {
                    return {
                        ...data,
                        _meta: metadata,
                    };
                }

                // Default: wrap in data object
                return this.wrapResponse(data, metadata);
            }),
        );
    }

    /**
     * Build response metadata
     */
    private buildMetadata(request: Request, duration: bigint): ResponseMetadata {
        return {
            timestamp: new Date().toISOString(),
            path: request.path,
            method: request.method,
            duration: Number(duration) / 1e6, // Convert to ms
            requestId: (request as any).id || (request.headers['x-request-id'] as string),
        };
    }

    /**
     * Wrap response data
     */
    private wrapResponse(data: any, metadata: ResponseMetadata): any {
        const response: any = {
            [this.defaultOptions.wrapperKey]: data,
        };

        if (this.defaultOptions.includeMetadata) {
            response._meta = metadata;
        }

        return response;
    }

    /**
     * Check if value is primitive
     */
    private isPrimitive(value: any): boolean {
        return (
            value === null ||
            value === undefined ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        );
    }

    /**
     * Check if response is already wrapped
     */
    private isWrappedResponse(value: any): boolean {
        if (!value || typeof value !== 'object') return false;
        return (
            (value.items !== undefined && value.total !== undefined) ||
            value.data !== undefined ||
            value._meta !== undefined
        );
    }

    /**
     * Get duration in nanoseconds
     */
    private getDuration(startTime: bigint): bigint {
        return process.hrtime.bigint() - startTime;
    }
}

/**
 * Snake case to camel case converter for keys
 */
export function transformKeysToCamelCase<T>(obj: any): T {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => transformKeysToCamelCase(item)) as T;
    }

    if (typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelKey] = transformKeysToCamelCase(obj[key]);
            return acc;
        }, {} as any) as T;
    }

    return obj;
}

/**
 * Camel case to snake case converter for keys
 */
export function transformKeysToSnakeCase<T>(obj: any): T {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => transformKeysToSnakeCase(item)) as T;
    }

    if (typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            acc[snakeKey] = transformKeysToSnakeCase(obj[key]);
            return acc;
        }, {} as any) as T;
    }

    return obj;
}

/**
 * Request key transformer interceptor
 */
@Injectable()
export class KeyTransformInterceptor implements NestInterceptor {
    constructor(private readonly toCamelCase: boolean = true) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        // Transform query params
        if (request.query) {
            request.query = this.toCamelCase
                ? transformKeysToCamelCase(request.query)
                : transformKeysToSnakeCase(request.query);
        }

        // Transform body
        if (request.body && typeof request.body === 'object') {
            request.body = this.toCamelCase
                ? transformKeysToCamelCase(request.body)
                : transformKeysToSnakeCase(request.body);
        }

        return next.handle();
    }
}
