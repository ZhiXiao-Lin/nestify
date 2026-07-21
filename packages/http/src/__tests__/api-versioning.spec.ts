import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import {
    API_SUPPORTED_VERSIONS_HEADER,
    API_VERSION_HEADER,
    API_VERSION_KEY,
    ApiVersion,
    ApiVersioningInterceptor,
    ApiVersioningModule,
    applyApiVersionHeaders,
    assertConsistentApiVersion,
    assertSupportedApiVersion,
    BusinessException,
    createApiVersioningOptions,
    Deprecated,
    extractRequestedApiVersion,
    extractRequestedApiVersionCandidates,
    extractVersionFromCustomHeader,
    extractVersionFromHeader,
    extractVersionFromUrl,
    HttpConfigurationError,
    isSupportedApiVersion,
    normalizeApiVersion,
    resolveRequestedApiVersion,
    Sunset,
    shouldBypassApiVersioning,
} from '../index';

describe('API version parsing and configuration', () => {
    it('normalizes URL, custom header, and vendor Accept versions', () => {
        expect(normalizeApiVersion('v01.0')).toBe('1');
        expect(normalizeApiVersion('latest')).toBeNull();
        expect(extractVersionFromUrl('/api/v2/orders?limit=1')).toBe('2');
        expect(extractVersionFromUrl('/other/v2/orders')).toBeNull();
        expect(extractVersionFromCustomHeader('v02')).toBe('2');
        expect(extractVersionFromHeader('application/vnd.a3s.v3+json')).toBe('3');
        expect(extractVersionFromHeader('x'.repeat(8_193))).toBeNull();
    });

    it('collects all declarations and rejects conflicting versions', () => {
        const request = {
            originalUrl: '/api/v1/orders',
            url: '/api/v1/orders',
            headers: {
                [API_VERSION_HEADER]: '2',
                accept: 'application/vnd.a3s.v1+json',
            },
        } as never;
        const candidates = extractRequestedApiVersionCandidates(request, {
            supportedVersions: ['1', '2'],
            defaultVersion: '1',
            bypassPathPrefixes: [],
        });

        expect(candidates).toEqual([
            { source: 'url', version: '1' },
            { source: 'x-api-version', version: '2' },
            { source: 'accept', version: '1' },
        ]);
        expect(() => assertConsistentApiVersion(candidates, ['1', '2'])).toThrow(BusinessException);
        expect(() => resolveRequestedApiVersion(candidates, '1', ['1', '2'])).toThrow(BusinessException);
    });

    it('uses validated custom defaults and supports custom version sets', () => {
        const options = createApiVersioningOptions({
            supportedVersions: ['v1', '2'],
            defaultVersion: '02',
            bypassPathPrefixes: ['/health/', '/git'],
        });

        expect(options).toEqual({
            supportedVersions: ['1', '2'],
            defaultVersion: '2',
            bypassPathPrefixes: ['/health', '/git'],
        });
        expect(Object.isFrozen(options)).toBe(true);
        expect(isSupportedApiVersion('2', options.supportedVersions)).toBe(true);
        expect(() => assertSupportedApiVersion('3', options.supportedVersions)).toThrow(BusinessException);
    });

    it.each([
        [{ supportedVersions: [] }, 'supportedVersions'],
        [{ supportedVersions: ['1', 'v01'] }, 'duplicate'],
        [{ supportedVersions: ['1'], defaultVersion: '2' }, 'defaultVersion'],
        [{ bypassPathPrefixes: ['relative'] }, 'absolute path'],
        [{ bypassPathPrefixes: ['/health', '/health/'] }, 'duplicate'],
    ])('rejects invalid options %p', (options, message) => {
        expect(() => createApiVersioningOptions(options)).toThrow(message);
    });

    it('bypasses only exact path segments without inspecting query strings', () => {
        expect(shouldBypassApiVersioning({ originalUrl: '/git/status?token=secret', url: '' }, ['/git'])).toBe(true);
        expect(shouldBypassApiVersioning({ originalUrl: '/github', url: '' }, ['/git'])).toBe(false);
    });

    it('extracts a default version when no source is present', () => {
        expect(
            extractRequestedApiVersion({ originalUrl: '/orders', url: '/orders', headers: {} } as never, {
                supportedVersions: ['1', '2'],
                defaultVersion: '2',
                bypassPathPrefixes: [],
            }),
        ).toBe('2');
    });
});

describe('API version response behavior', () => {
    it('validates all metadata before writing response headers', () => {
        const setHeader = jest.fn();
        const response = { headersSent: false, setHeader };

        expect(() => applyApiVersionHeaders(response, 'invalid')).toThrow(HttpConfigurationError);
        expect(() => applyApiVersionHeaders(response, '3', { supportedVersions: ['1', '2'] })).toThrow(
            HttpConfigurationError,
        );
        expect(() => applyApiVersionHeaders(response, '1', { sunsetDate: new Date('invalid') })).toThrow(
            HttpConfigurationError,
        );
        expect(setHeader).not.toHaveBeenCalled();

        applyApiVersionHeaders(response, 'v2', {
            deprecated: true,
            sunsetDate: new Date('2027-01-01T00:00:00.000Z'),
            supportedVersions: ['1', '2'],
        });
        expect(setHeader).toHaveBeenCalledWith(API_VERSION_HEADER, '2');
        expect(setHeader).toHaveBeenCalledWith(API_SUPPORTED_VERSIONS_HEADER, '1,2');
        expect(setHeader).toHaveBeenCalledWith('Deprecation', 'true');
        expect(setHeader).toHaveBeenCalledWith('Sunset', 'Fri, 01 Jan 2027 00:00:00 GMT');
    });

    it('validates decorator metadata at definition time', () => {
        expect(() => ApiVersion('latest')).toThrow(HttpConfigurationError);
        expect(() => Sunset(new Date('invalid'))).toThrow(HttpConfigurationError);
        expect(ApiVersion(['1', '2'])).toBeDefined();
        expect(Deprecated()).toBeDefined();
    });

    it('enforces configured and endpoint versions before invoking the handler', async () => {
        const reflector = new Reflector();
        const interceptor = new ApiVersioningInterceptor(reflector, {
            supportedVersions: ['1', '2'],
            defaultVersion: '1',
            bypassPathPrefixes: [],
        });
        const handler = () => undefined;
        Reflect.defineMetadata(API_VERSION_KEY, ['2'], handler);
        const setHeader = jest.fn();
        const context = createContext({
            handler,
            request: { originalUrl: '/orders', url: '/orders', headers: { [API_VERSION_HEADER]: '2' } },
            response: { headersSent: false, setHeader },
        });

        await expect(lastValueFrom(interceptor.intercept(context, { handle: () => of('ok') }))).resolves.toBe('ok');
        expect(context.switchToHttp().getRequest()).toHaveProperty('apiVersion', '2');
        expect(setHeader).toHaveBeenCalledWith(API_VERSION_HEADER, '2');
    });

    it('rejects unsupported endpoint versions without writing headers', () => {
        const reflector = new Reflector();
        const interceptor = new ApiVersioningInterceptor(reflector, {
            supportedVersions: ['1', '2'],
            defaultVersion: '1',
            bypassPathPrefixes: [],
        });
        const handler = () => undefined;
        Reflect.defineMetadata(API_VERSION_KEY, '1', handler);
        const setHeader = jest.fn();
        const context = createContext({
            handler,
            request: { originalUrl: '/orders', url: '/orders', headers: { [API_VERSION_HEADER]: '2' } },
            response: { headersSent: false, setHeader },
        });

        expect(() => interceptor.intercept(context, { handle: () => of('never') })).toThrow(BusinessException);
        expect(setHeader).not.toHaveBeenCalled();
    });

    it('exposes validated sync and async module providers', async () => {
        const syncModule = ApiVersioningModule.register({ supportedVersions: ['1', '2'], defaultVersion: '2' });
        const asyncModule = ApiVersioningModule.registerAsync({ useFactory: async () => ({ defaultVersion: '1' }) });
        const provider = asyncModule.providers?.[0] as { useFactory: () => Promise<unknown> };

        expect(syncModule.providers).toHaveLength(1);
        await expect(provider.useFactory()).resolves.toMatchObject({ defaultVersion: '1' });
        expect(() => ApiVersioningModule.registerAsync({ useFactory: null } as never)).toThrow(HttpConfigurationError);
    });
});

function createContext(options: {
    handler: Function;
    request: Record<string, unknown>;
    response: Record<string, unknown>;
}) {
    return {
        getHandler: () => options.handler,
        getClass: () => class TestController {},
        switchToHttp: () => ({
            getRequest: () => options.request,
            getResponse: () => options.response,
        }),
    } as never;
}
