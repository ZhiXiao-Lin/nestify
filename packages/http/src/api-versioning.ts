import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { BusinessException, StatusCode } from './exceptions';
import { firstHeaderValue, ResponseHeaderCarrier } from './request-id';

export const API_VERSION_KEY = 'api_version';
export const API_DEPRECATED_KEY = 'isDeprecated';
export const API_SUNSET_DATE_KEY = 'sunsetDate';
export const ApiVersion = (version: string | string[]) => SetMetadata(API_VERSION_KEY, version);
export const Deprecated = () => SetMetadata(API_DEPRECATED_KEY, true);
export const Sunset = (date: Date) => SetMetadata(API_SUNSET_DATE_KEY, date);

export const DEFAULT_API_VERSION = '1';
export const SUPPORTED_API_VERSIONS = ['1'] as const;
export const API_VERSION_HEADER = 'x-api-version';
export const API_SUPPORTED_VERSIONS_HEADER = 'x-api-supported-versions';
export type SupportedApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];
export type ApiVersionSource = 'url' | 'x-api-version' | 'accept';

export interface ApiVersionedRequest extends Request {
    apiVersion?: string;
}

export interface RequestedApiVersion {
    source: ApiVersionSource;
    version: string;
}

export function normalizeApiVersion(version: string | null | undefined): string | null {
    if (!version) return null;
    const match = version.trim().match(/^v?(\d+)(?:\.0)?$/i);
    return match ? match[1] : null;
}

export function extractVersionFromUrl(url: string): string | null {
    const match = url.match(/^\/api\/v(\d+)(?=\/|$|\?)/);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromHeader(header: string | string[] | undefined): string | null {
    const headerValue = firstHeaderValue(header);
    if (!headerValue) return null;
    const match = headerValue.match(/(?:^|[.\s])v(\d+)(?:[+;,\s]|$)/i);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromCustomHeader(header: string | string[] | undefined): string | null {
    return normalizeApiVersion(firstHeaderValue(header));
}

export function shouldBypassApiVersioning(request: Pick<Request, 'originalUrl' | 'url'>): boolean {
    const requestUrl = request.originalUrl || request.url || '';
    return /^\/(?:v2|git)(?:\/|$|\?)/.test(requestUrl);
}

export function extractRequestedApiVersionCandidates(request: Request): RequestedApiVersion[] {
    if (shouldBypassApiVersioning(request)) return [];
    const requestUrl = request.originalUrl || request.url;
    const candidates: RequestedApiVersion[] = [];
    const urlVersion = extractVersionFromUrl(requestUrl);
    const customHeaderVersion = extractVersionFromCustomHeader(request.headers[API_VERSION_HEADER]);
    const acceptHeaderVersion = extractVersionFromHeader(request.headers.accept);
    if (urlVersion) candidates.push({ source: 'url', version: urlVersion });
    if (customHeaderVersion) candidates.push({ source: 'x-api-version', version: customHeaderVersion });
    if (acceptHeaderVersion) candidates.push({ source: 'accept', version: acceptHeaderVersion });
    return candidates;
}

export function assertConsistentApiVersion(candidates: RequestedApiVersion[]): void {
    const versions = [...new Set(candidates.map(candidate => candidate.version))];
    if (versions.length > 1) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Conflicting API version declarations',
            details: { requestedVersions: candidates, supportedVersions: [...SUPPORTED_API_VERSIONS] },
        });
    }
}

export function resolveRequestedApiVersion(candidates: RequestedApiVersion[]): string {
    assertConsistentApiVersion(candidates);
    return candidates[0]?.version || DEFAULT_API_VERSION;
}

export function extractRequestedApiVersion(request: Request): string {
    return resolveRequestedApiVersion(extractRequestedApiVersionCandidates(request));
}

export function isSupportedApiVersion(version: string): version is SupportedApiVersion {
    return SUPPORTED_API_VERSIONS.includes(version as SupportedApiVersion);
}

export function assertSupportedApiVersion(version: string): void {
    if (!isSupportedApiVersion(version)) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Unsupported API version',
            details: { requestedVersion: version, supportedVersions: [...SUPPORTED_API_VERSIONS] },
        });
    }
}

export function applyApiVersionHeaders(
    response: ResponseHeaderCarrier,
    version: string,
    options: { deprecated?: boolean; sunsetDate?: Date } = {},
): void {
    if (response.headersSent) return;
    response.setHeader(API_VERSION_HEADER, version);
    response.setHeader(API_SUPPORTED_VERSIONS_HEADER, SUPPORTED_API_VERSIONS.join(','));
    if (options.deprecated) response.setHeader('Deprecation', 'true');
    if (options.sunsetDate) response.setHeader('Sunset', options.sunsetDate.toUTCString());
}

@Injectable()
export class ApiVersioningInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<ApiVersionedRequest>();
        const response = http.getResponse<ResponseHeaderCarrier>();
        if (shouldBypassApiVersioning(request)) {
            return next.handle();
        }

        const versionCandidates = extractRequestedApiVersionCandidates(request);
        const requestedVersion = versionCandidates[0]?.version || DEFAULT_API_VERSION;
        request.apiVersion = requestedVersion;

        applyApiVersionHeaders(response, requestedVersion);
        assertConsistentApiVersion(versionCandidates);
        assertSupportedApiVersion(requestedVersion);

        const routeVersions = this.reflector.getAllAndOverride<string | string[] | undefined>(API_VERSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (routeVersions) {
            const allowedVersions = Array.isArray(routeVersions) ? routeVersions : [routeVersions];
            if (!allowedVersions.map(item => normalizeApiVersion(item)).includes(requestedVersion)) {
                throw new BusinessException({
                    code: StatusCode.BAD_REQUEST,
                    message: 'Endpoint does not support the requested API version',
                    details: { requestedVersion, endpointVersions: allowedVersions },
                });
            }
        }

        const isDeprecated = this.reflector.getAllAndOverride<boolean>(API_DEPRECATED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const sunsetDate = this.reflector.getAllAndOverride<Date | undefined>(API_SUNSET_DATE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        applyApiVersionHeaders(response, requestedVersion, { deprecated: isDeprecated, sunsetDate });
        return next.handle();
    }
}
