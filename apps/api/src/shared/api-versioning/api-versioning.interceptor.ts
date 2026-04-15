// ============================================================================
// API Versioning - URL and Header based versioning
// ============================================================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export interface ApiVersionOptions {
    /** Current API version */
    version: string;
    /** Deprecation info */
    deprecated?: boolean;
    /** Sunset date */
    sunsetDate?: Date;
}

/**
 * Default API version
 */
export const DEFAULT_API_VERSION = '1';

/**
 * Extract API version from URL path
 * Supports /api/v1, /api/v2 patterns
 */
export function extractVersionFromUrl(url: string): string | null {
    const match = url.match(/\/api\/v(\d+)/);
    return match ? match[1] : null;
}

/**
 * Extract API version from Accept-Header
 * Supports: application/vnd.api.v1+json
 */
export function extractVersionFromHeader(header: string | string[] | undefined): string | null {
    if (!header) return null;

    const headerValue = Array.isArray(header) ? header[0] : header;
    const match = headerValue.match(/v(\d+)/);
    return match ? match[1] : null;
}

/**
 * Extract API version from custom header
 * Supports: X-API-Version: 1
 */
export function extractVersionFromCustomHeader(
    header: string | string[] | undefined,
): string | null {
    if (!header) return null;
    const value = Array.isArray(header) ? header[0] : header;
    return value || null;
}

@Injectable()
export class ApiVersioningInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();

        // Try URL first (e.g., /api/v1/users)
        let version = extractVersionFromUrl(request.url);

        // Fallback to Accept header
        if (!version) {
            version = extractVersionFromHeader(request.headers.accept);
        }

        // Fallback to custom header
        if (!version) {
            version = extractVersionFromCustomHeader(
                request.headers['x-api-version'],
            );
        }

        // Default to v1 if no version specified
        if (!version) {
            version = DEFAULT_API_VERSION;
        }

        // Attach version to request
        (request as any).apiVersion = version;

        return next.handle();
    }
}
