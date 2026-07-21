import {
    type CallHandler,
    type DynamicModule,
    type ExecutionContext,
    type FactoryProvider,
    Global,
    Inject,
    Injectable,
    Module,
    type ModuleMetadata,
    type NestInterceptor,
    Optional,
    SetMetadata,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { BusinessException, StatusCode } from './exceptions';
import { getSafeRequestPath, HttpConfigurationError, normalizeHttpText } from './http-boundary';
import { firstHeaderValue, type ResponseHeaderCarrier } from './request-id';

export const API_VERSION_KEY = 'api_version';
export const API_DEPRECATED_KEY = 'isDeprecated';
export const API_SUNSET_DATE_KEY = 'sunsetDate';
export const API_VERSIONING_OPTIONS = Symbol.for('@a3s-lab/http/api-versioning-options');

export const DEFAULT_API_VERSION = '1';
export const SUPPORTED_API_VERSIONS = ['1'] as const;
export const DEFAULT_API_VERSION_BYPASS_PREFIXES = ['/v2', '/git'] as const;
export const API_VERSION_HEADER = 'x-api-version';
export const API_SUPPORTED_VERSIONS_HEADER = 'x-api-supported-versions';
export type SupportedApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];
export type ApiVersionSource = 'url' | 'x-api-version' | 'accept';

export interface ApiVersioningOptions {
    supportedVersions?: readonly string[];
    defaultVersion?: string;
    /** Exact path prefixes bypassing API version checks. Defaults to `/v2` and `/git` for compatibility. */
    bypassPathPrefixes?: readonly string[];
}

export interface ApiVersioningAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<ApiVersioningOptions>['useFactory'];
}

export interface NormalizedApiVersioningOptions {
    readonly supportedVersions: readonly string[];
    readonly defaultVersion: string;
    readonly bypassPathPrefixes: readonly string[];
}

export interface ApiVersionedRequest extends Request {
    apiVersion?: string;
}

export interface RequestedApiVersion {
    source: ApiVersionSource;
    version: string;
}

export function ApiVersion(version: string | string[]): ReturnType<typeof SetMetadata> {
    const versions = normalizeVersionList(Array.isArray(version) ? version : [version], 'ApiVersion');
    return SetMetadata(API_VERSION_KEY, Array.isArray(version) ? versions : versions[0]);
}

export const Deprecated = () => SetMetadata(API_DEPRECATED_KEY, true);

export function Sunset(date: Date): ReturnType<typeof SetMetadata> {
    assertValidDate(date, 'Sunset');
    return SetMetadata(API_SUNSET_DATE_KEY, new Date(date.getTime()));
}

export function createApiVersioningOptions(options: ApiVersioningOptions = {}): NormalizedApiVersioningOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new HttpConfigurationError('API versioning options must be an object.');
    }
    const supportedVersions = Object.freeze(
        normalizeVersionList(options.supportedVersions ?? SUPPORTED_API_VERSIONS, 'supportedVersions'),
    );
    const defaultVersion = normalizeApiVersion(options.defaultVersion ?? DEFAULT_API_VERSION);
    if (!defaultVersion || !supportedVersions.includes(defaultVersion)) {
        throw new HttpConfigurationError('defaultVersion must be included in supportedVersions.');
    }

    const bypassPathPrefixes = Object.freeze(
        normalizeBypassPrefixes(options.bypassPathPrefixes ?? DEFAULT_API_VERSION_BYPASS_PREFIXES),
    );
    return Object.freeze({ supportedVersions, defaultVersion, bypassPathPrefixes });
}

export function normalizeApiVersion(version: string | null | undefined): string | null {
    if (!version || version.length > 32) return null;
    const match = version.trim().match(/^v?(\d+)(?:\.0)?$/i);
    return match ? match[1].replace(/^0+(?=\d)/, '') : null;
}

export function extractVersionFromUrl(url: string): string | null {
    if (typeof url !== 'string' || url.length > 8_192) {
        return null;
    }
    const match = url.match(/^\/api\/v(\d{1,32})(?=\/|$|\?)/);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromHeader(header: string | string[] | undefined): string | null {
    const headerValue = firstHeaderValue(header);
    if (!headerValue || headerValue.length > 8_192) return null;
    const match = headerValue.match(/(?:^|[.\s])v(\d{1,32})(?:[+;,\s]|$)/i);
    return normalizeApiVersion(match?.[1]);
}

export function extractVersionFromCustomHeader(header: string | string[] | undefined): string | null {
    return normalizeApiVersion(firstHeaderValue(header));
}

export function shouldBypassApiVersioning(
    request: Pick<Request, 'originalUrl' | 'url'>,
    bypassPathPrefixes: readonly string[] = DEFAULT_API_VERSION_BYPASS_PREFIXES,
): boolean {
    const requestPath = getSafeRequestPath(request);
    return bypassPathPrefixes.some(prefix => requestPath === prefix || requestPath.startsWith(`${prefix}/`));
}

export function extractRequestedApiVersionCandidates(
    request: Request,
    options: ApiVersioningOptions = {},
): RequestedApiVersion[] {
    const normalizedOptions = createApiVersioningOptions(options);
    if (shouldBypassApiVersioning(request, normalizedOptions.bypassPathPrefixes)) return [];
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

export function assertConsistentApiVersion(
    candidates: RequestedApiVersion[],
    supportedVersions: readonly string[] = SUPPORTED_API_VERSIONS,
): void {
    const versions = [...new Set(candidates.map(candidate => candidate.version))];
    if (versions.length > 1) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Conflicting API version declarations',
            details: { requestedVersions: candidates, supportedVersions: [...supportedVersions] },
        });
    }
}

export function resolveRequestedApiVersion(
    candidates: RequestedApiVersion[],
    defaultVersion = DEFAULT_API_VERSION,
    supportedVersions: readonly string[] = SUPPORTED_API_VERSIONS,
): string {
    assertConsistentApiVersion(candidates, supportedVersions);
    const normalizedDefault = normalizeApiVersion(defaultVersion);
    if (!normalizedDefault) {
        throw new HttpConfigurationError('defaultVersion must be a valid API version.');
    }
    return candidates[0]?.version ?? normalizedDefault;
}

export function extractRequestedApiVersion(request: Request, options: ApiVersioningOptions = {}): string {
    const normalized = createApiVersioningOptions(options);
    return resolveRequestedApiVersion(
        extractRequestedApiVersionCandidates(request, normalized),
        normalized.defaultVersion,
    );
}

export function isSupportedApiVersion(
    version: string,
    supportedVersions: readonly string[] = SUPPORTED_API_VERSIONS,
): boolean {
    return supportedVersions.includes(version);
}

export function assertSupportedApiVersion(
    version: string,
    supportedVersions: readonly string[] = SUPPORTED_API_VERSIONS,
): void {
    if (!isSupportedApiVersion(version, supportedVersions)) {
        throw new BusinessException({
            code: StatusCode.BAD_REQUEST,
            message: 'Unsupported API version',
            details: { requestedVersion: version, supportedVersions: [...supportedVersions] },
        });
    }
}

export function applyApiVersionHeaders(
    response: ResponseHeaderCarrier,
    version: string,
    options: {
        deprecated?: boolean;
        sunsetDate?: Date;
        supportedVersions?: readonly string[];
    } = {},
): void {
    if (response.headersSent) return;
    const normalizedVersion = normalizeApiVersion(version);
    if (!normalizedVersion) {
        throw new HttpConfigurationError('Response API version must be valid.');
    }
    const supportedVersions = normalizeVersionList(
        options.supportedVersions ?? SUPPORTED_API_VERSIONS,
        'supportedVersions',
    );
    if (!supportedVersions.includes(normalizedVersion)) {
        throw new HttpConfigurationError('Response API version must be included in supportedVersions.');
    }
    if (options.deprecated !== undefined && typeof options.deprecated !== 'boolean') {
        throw new HttpConfigurationError('deprecated must be a boolean.');
    }
    if (options.sunsetDate !== undefined) {
        assertValidDate(options.sunsetDate, 'sunsetDate');
    }
    if (typeof response.setHeader !== 'function') {
        throw new HttpConfigurationError('Response must provide a setHeader function.');
    }

    response.setHeader(API_VERSION_HEADER, normalizedVersion);
    response.setHeader(API_SUPPORTED_VERSIONS_HEADER, supportedVersions.join(','));
    if (options.deprecated) response.setHeader('Deprecation', 'true');
    if (options.sunsetDate) response.setHeader('Sunset', options.sunsetDate.toUTCString());
}

@Injectable()
export class ApiVersioningInterceptor implements NestInterceptor {
    private readonly options: NormalizedApiVersioningOptions;

    constructor(
        private readonly reflector: Reflector,
        @Optional() @Inject(API_VERSIONING_OPTIONS) options: ApiVersioningOptions = {},
    ) {
        this.options = createApiVersioningOptions(options);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<ApiVersionedRequest>();
        const response = http.getResponse<ResponseHeaderCarrier>();
        if (shouldBypassApiVersioning(request, this.options.bypassPathPrefixes)) {
            return next.handle();
        }

        const versionCandidates = extractRequestedApiVersionCandidates(request, this.options);
        const requestedVersion = resolveRequestedApiVersion(
            versionCandidates,
            this.options.defaultVersion,
            this.options.supportedVersions,
        );
        assertSupportedApiVersion(requestedVersion, this.options.supportedVersions);

        const routeVersions = this.reflector.getAllAndOverride<string | string[] | undefined>(API_VERSION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (routeVersions) {
            const allowedVersions = normalizeVersionList(
                Array.isArray(routeVersions) ? routeVersions : [routeVersions],
                'ApiVersion metadata',
            );
            if (!allowedVersions.includes(requestedVersion)) {
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
        request.apiVersion = requestedVersion;
        applyApiVersionHeaders(response, requestedVersion, {
            deprecated: isDeprecated,
            sunsetDate,
            supportedVersions: this.options.supportedVersions,
        });
        return next.handle();
    }
}

function normalizeVersionList(versions: readonly string[], name: string): string[] {
    if (!Array.isArray(versions) || versions.length === 0 || versions.length > 32) {
        throw new HttpConfigurationError(`${name} must contain between 1 and 32 API versions.`);
    }
    const normalized = versions.map(version => normalizeApiVersion(version));
    if (normalized.some(version => !version)) {
        throw new HttpConfigurationError(`${name} contains an invalid API version.`);
    }
    const unique = [...new Set(normalized as string[])];
    if (unique.length !== normalized.length) {
        throw new HttpConfigurationError(`${name} must not contain duplicate API versions.`);
    }
    return unique;
}

function normalizeBypassPrefixes(prefixes: readonly string[]): string[] {
    if (!Array.isArray(prefixes) || prefixes.length > 32) {
        throw new HttpConfigurationError('bypassPathPrefixes must contain at most 32 paths.');
    }
    const normalized = prefixes.map(prefix => {
        const normalized = normalizeHttpText(prefix, { maxLength: 256 });
        if (!normalized.startsWith('/') || normalized.includes('?') || normalized.includes('#')) {
            throw new HttpConfigurationError('Each bypass path prefix must be an absolute path without a query.');
        }
        return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized;
    });
    if (new Set(normalized).size !== normalized.length) {
        throw new HttpConfigurationError('bypassPathPrefixes must not contain duplicate paths.');
    }
    return normalized;
}

function assertValidDate(value: Date, name: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new HttpConfigurationError(`${name} must be a valid Date.`);
    }
}

@Global()
@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: ApiVersioningInterceptor }],
})
export class ApiVersioningModule {
    static register(options: ApiVersioningOptions = {}): DynamicModule {
        return {
            module: ApiVersioningModule,
            providers: [{ provide: API_VERSIONING_OPTIONS, useValue: createApiVersioningOptions(options) }],
        };
    }

    static registerAsync(options: ApiVersioningAsyncOptions): DynamicModule {
        if (!options || typeof options !== 'object' || typeof options.useFactory !== 'function') {
            throw new HttpConfigurationError('ApiVersioningModule.registerAsync requires a useFactory function.');
        }
        return {
            module: ApiVersioningModule,
            imports: options.imports,
            providers: [
                {
                    provide: API_VERSIONING_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: Parameters<ApiVersioningAsyncOptions['useFactory']>) =>
                        createApiVersioningOptions(await options.useFactory(...args)),
                },
            ],
        };
    }
}
