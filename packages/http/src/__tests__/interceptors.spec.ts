import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import {
    ApiResponseInterceptor,
    DomainException,
    DomainExceptionFilter,
    GlobalErrorFilter,
    getOrCreateRequestId,
    HttpExceptionFilter,
    KeyTransformInterceptor,
    LoggingInterceptor,
    SKIP_API_RESPONSE,
    StatusCode,
    TransformInterceptor,
    transformKeysToCamelCase,
    transformKeysToSnakeCase,
} from '../index';

describe('http Nest integrations', () => {
    it('wraps successful responses and attaches request id headers', async () => {
        const interceptor = new ApiResponseInterceptor(new Reflector());
        const headers = new Map<string, string>();
        const response = {
            statusCode: 201,
            headersSent: false,
            setHeader: (name: string, value: string) => headers.set(name, value),
        };
        const request = { headers: { 'x-request-id': 'req-http' } };

        const result = await lastValueFrom(
            interceptor.intercept(createHttpContext({ request, response }), { handle: () => of({ id: 'created' }) }),
        );

        expect(result).toMatchObject({
            code: 201,
            status: 'SUCCESS',
            data: { id: 'created' },
            requestId: 'req-http',
        });
        expect(headers.get('x-request-id')).toBe('req-http');
    });

    it('honors SkipApiResponse metadata through the real Reflector', async () => {
        const reflector = new Reflector();
        const interceptor = new ApiResponseInterceptor(reflector);
        const handler = () => undefined;
        Reflect.defineMetadata(SKIP_API_RESPONSE, true, handler);

        const result = await lastValueFrom(
            interceptor.intercept(createHttpContext({ handler }), { handle: () => of({ raw: true }) }),
        );

        expect(result).toEqual({ raw: true });
    });

    it('normalizes Nest exceptions in the global error filter', () => {
        const filter = new GlobalErrorFilter();
        const json = jest.fn();
        const status = jest.fn(() => ({ json }));
        const headers = new Map<string, string>();
        const request = { headers: {}, url: '/orders', method: 'POST' };
        const response = {
            headersSent: false,
            setHeader: (name: string, value: string) => headers.set(name, value),
            status,
        };

        filter.catch(
            new BadRequestException({
                status: StatusCode.VALIDATION_ERROR,
                message: ['name must not be empty'],
            }),
            createArgumentsHost({ request, response }),
        );

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 400,
                status: StatusCode.VALIDATION_ERROR,
                message: 'Validation failed',
                requestId: getOrCreateRequestId(request),
            }),
        );
        expect(headers.get('x-request-id')).toBeDefined();
    });

    it('normalizes domain exceptions in the global error filter', () => {
        const filter = new GlobalErrorFilter();
        const json = jest.fn();
        const status = jest.fn(() => ({ json }));
        const request = { headers: {}, url: '/resources/1', method: 'PATCH' };
        const response = { headersSent: false, setHeader: jest.fn(), status };

        filter.catch(new DomainException('transition is not allowed'), createArgumentsHost({ request, response }));

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 400,
                status: StatusCode.BUSINESS_RULE_VIOLATION,
                message: 'transition is not allowed',
                details: { type: 'DomainException' },
            }),
        );
    });

    it('keeps compatibility domain and http exception filters available', () => {
        const domainFilter = new DomainExceptionFilter();
        const httpFilter = new HttpExceptionFilter();
        const domainJson = jest.fn();
        const httpJson = jest.fn();
        const request = { headers: {}, url: '/resources/1', method: 'GET' };

        domainFilter.catch(
            new DomainException('rule failed'),
            createArgumentsHost({ request, response: { status: jest.fn(() => ({ json: domainJson })) } }),
        );
        httpFilter.catch(
            new NotFoundException('missing'),
            createArgumentsHost({ request, response: { status: jest.fn(() => ({ json: httpJson })) } }),
        );

        expect(domainJson).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 400, message: 'rule failed', type: 'DomainException' }),
        );
        expect(httpJson).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, message: 'missing' }));
    });

    it('wraps generic transformed responses with metadata', async () => {
        const interceptor = new TransformInterceptor();
        const request = {
            id: 'req-from-request',
            headers: { 'x-request-id': 'req-transform' },
            path: '/resources/1',
            method: 'GET',
        };

        const result = await lastValueFrom(
            interceptor.intercept(createHttpContext({ request }), { handle: () => of({ id: 'resource-1' }) }),
        );

        expect(result).toMatchObject({
            data: { id: 'resource-1' },
            _meta: {
                path: '/resources/1',
                method: 'GET',
                requestId: 'req-transform',
            },
        });
    });

    it('transforms request keys and preserves non-plain values', async () => {
        const date = new Date('2026-01-01T00:00:00.000Z');
        const request = {
            headers: {},
            query: { page_size: '20' },
            body: { resource_id: 'res-1', nested_value: [{ child_name: 'child', created_at: date }] },
        };
        const interceptor = new KeyTransformInterceptor();

        await lastValueFrom(interceptor.intercept(createHttpContext({ request }), { handle: () => of('ok') }));

        expect(request.query).toEqual({ pageSize: '20' });
        expect(request.body).toEqual({ resourceId: 'res-1', nestedValue: [{ childName: 'child', createdAt: date }] });
        expect(transformKeysToSnakeCase({ resourceId: 'res-1', nestedValue: [{ childName: 'child' }] })).toEqual({
            resource_id: 'res-1',
            nested_value: [{ child_name: 'child' }],
        });
        expect(transformKeysToCamelCase(date)).toBe(date);
    });

    it('logs request and response around the handler', async () => {
        const interceptor = new LoggingInterceptor();
        const request = { headers: {}, url: '/resources/1', method: 'GET' };
        const response = { statusCode: 204 };

        const result = await lastValueFrom(
            interceptor.intercept(createHttpContext({ request, response }), { handle: () => of('done') }),
        );

        expect(result).toBe('done');
    });
});

function createHttpContext(options: {
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
    handler?: Function;
    targetClass?: Function;
}) {
    const request = options.request ?? { headers: {} };
    const response = options.response ?? { headersSent: false, statusCode: 200, setHeader: jest.fn() };
    const handler = options.handler ?? (() => undefined);
    const targetClass = options.targetClass ?? class TestController {};

    return {
        getHandler: () => handler,
        getClass: () => targetClass,
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as never;
}

function createArgumentsHost(options: { request: Record<string, unknown>; response: Record<string, unknown> }) {
    return {
        switchToHttp: () => ({
            getRequest: () => options.request,
            getResponse: () => options.response,
        }),
    } as never;
}
