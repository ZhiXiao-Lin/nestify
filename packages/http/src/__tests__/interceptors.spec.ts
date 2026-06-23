import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import {
    ApiResponseInterceptor,
    GlobalErrorFilter,
    SKIP_API_RESPONSE,
    StatusCode,
    getOrCreateRequestId,
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
