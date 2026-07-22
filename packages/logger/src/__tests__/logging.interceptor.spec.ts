import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { LoggerServiceImpl } from '../logger.service';
import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggingInterceptor', () => {
    it('propagates isolated context, strips query data, trusts Express ip, and logs once', async () => {
        const harness = createHarness({
            request: {
                method: 'GET',
                originalUrl: '/resources/42?token=secret',
                url: '/resources/42?token=secret',
                baseUrl: '/api',
                route: { path: '/resources/:id' },
                ip: '203.0.113.10',
                headers: {
                    'x-request-id': 'request-1',
                    'x-forwarded-for': '198.51.100.99',
                    'user-agent': 'test-agent',
                },
            },
        });
        let observedContext: unknown;
        harness.next.handle.mockReturnValue(
            new Observable(subscriber => {
                setImmediate(() => {
                    observedContext = LoggerServiceImpl.getRequestContext();
                    subscriber.next({ ok: true });
                    subscriber.complete();
                });
            }),
        );

        await expect(
            lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next)),
        ).resolves.toEqual({
            ok: true,
        });

        expect(observedContext).toMatchObject({
            requestId: 'request-1',
            method: 'GET',
            url: '/resources/42',
            route: '/api/resources/:id',
            ip: '203.0.113.10',
            clientAgent: 'test-agent',
        });
        expect(observedContext).not.toHaveProperty('requestHeaders');
        expect(harness.response.setHeader).toHaveBeenCalledWith('x-request-id', 'request-1');
        expect(harness.logger.logRequest).toHaveBeenCalledTimes(1);
        expect(harness.logger.logRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'GET',
                url: '/resources/42',
                requestId: 'request-1',
                statusCode: 200,
                context: { route: '/api/resources/:id' },
            }),
        );
    });

    it('captures opted-in headers and bodies with bounded header size and the final response value', async () => {
        const longHeader = 'x'.repeat(2_000);
        const harness = createHarness({
            request: {
                method: 'POST',
                originalUrl: '/resources',
                body: { password: 'secret', value: 1 },
                headers: {
                    'x-correlation-id': ['correlation-1', 'ignored'],
                    authorization: 'Bearer secret',
                    'x-long': longHeader,
                },
            },
        });
        harness.next.handle.mockReturnValue(of({ page: 1 }, { page: 2 }));
        const interceptor = new LoggingInterceptor(harness.logger, {
            logRequestHeaders: true,
            logRequestBody: true,
            logResponseBody: true,
        });

        await expect(lastValueFrom(interceptor.intercept(harness.context, harness.next))).resolves.toEqual({ page: 2 });

        expect(harness.logger.logRequest).toHaveBeenCalledTimes(1);
        const input = harness.logger.logRequest.mock.calls[0][0];
        expect(input).toMatchObject({
            requestId: 'correlation-1',
            headers: {
                authorization: 'Bearer secret',
                'x-correlation-id': ['correlation-1', 'ignored'],
            },
            body: { password: 'secret', value: 1 },
            responseBody: { page: 2 },
        });
        expect(input.headers['x-long']).toHaveLength(1_024);
        expect(input.headers['x-long']).toMatch(/…$/u);
    });

    it('rejects unsafe inbound request ids and does not overwrite an existing response header', async () => {
        const harness = createHarness({
            request: {
                headers: { 'x-request-id': 'bad\nrequest' },
            },
            responseHeaders: { 'x-request-id': 'upstream-id' },
        });
        harness.next.handle.mockReturnValue(of('ok'));

        await lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next));

        const generated = harness.logger.logRequest.mock.calls[0][0].requestId as string;
        expect(generated).toMatch(/^[0-9a-f-]{36}$/u);
        expect(generated).not.toBe('bad\nrequest');
        expect(harness.response.setHeader).not.toHaveBeenCalled();
    });

    it('uses a custom request id header and can disable the response header', async () => {
        const harness = createHarness({ request: { headers: { 'x-trace-id': 'trace-1' } } });
        harness.next.handle.mockReturnValue(of('ok'));
        const interceptor = new LoggingInterceptor(harness.logger, {
            requestIdHeaders: ['x-trace-id'],
            responseRequestIdHeader: false,
        });

        await lastValueFrom(interceptor.intercept(harness.context, harness.next));

        expect(harness.logger.logRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'trace-1' }));
        expect(harness.response.setHeader).not.toHaveBeenCalled();
    });

    it('logs observable errors once with a validated HTTP status and preserves the error', async () => {
        const error = Object.assign(new Error('teapot'), { status: 418 });
        const harness = createHarness();
        harness.next.handle.mockReturnValue(throwError(() => error));

        await expect(
            lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next)),
        ).rejects.toBe(error);

        expect(harness.logger.logRequest).toHaveBeenCalledTimes(1);
        expect(harness.logger.logRequest).toHaveBeenCalledWith(expect.objectContaining({ error, statusCode: 418 }));
    });

    it('handles synchronous handler failures and invalid status values without losing the error', async () => {
        const error = Object.assign(new Error('sync failure'), { statusCode: 200 });
        const harness = createHarness();
        harness.next.handle.mockImplementation(() => {
            throw error;
        });

        await expect(
            lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next)),
        ).rejects.toBe(error);

        expect(harness.logger.logRequest).toHaveBeenCalledWith(expect.objectContaining({ error, statusCode: 500 }));
    });

    it('keeps request context on excluded paths without emitting a request log', async () => {
        const harness = createHarness({ request: { originalUrl: '/health/ready?verbose=true' } });
        let context: unknown;
        harness.next.handle.mockReturnValue(
            new Observable(subscriber => {
                setImmediate(() => {
                    context = LoggerServiceImpl.getRequestContext();
                    subscriber.next('ready');
                    subscriber.complete();
                });
            }),
        );

        await lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next));

        expect(context).toMatchObject({ url: '/health/ready', requestId: expect.any(String) });
        expect(harness.logger.logRequest).not.toHaveBeenCalled();
    });

    it('isolates concurrent asynchronous request contexts', async () => {
        const left = createHarness({ request: { headers: { 'x-request-id': 'left' } } });
        const right = createHarness({ request: { headers: { 'x-request-id': 'right' } } });
        const observed: string[] = [];
        left.next.handle.mockReturnValue(delayedContext(15, observed));
        right.next.handle.mockReturnValue(delayedContext(1, observed));
        const interceptor = new LoggingInterceptor(left.logger);

        await Promise.all([
            lastValueFrom(interceptor.intercept(left.context, left.next)),
            lastValueFrom(interceptor.intercept(right.context, right.next)),
        ]);

        expect(observed.sort()).toEqual(['left', 'right']);
    });

    it('continues when setting the response id header fails', async () => {
        const harness = createHarness();
        harness.response.setHeader.mockImplementation(() => {
            throw new Error('headers locked');
        });
        harness.next.handle.mockReturnValue(of('ok'));

        await expect(
            lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next)),
        ).resolves.toBe('ok');
        expect(harness.logger.warn).toHaveBeenCalledWith('Unable to set the response request id header', {
            error: 'headers locked',
        });
    });

    it('does not set a response id after headers have already been sent', async () => {
        const harness = createHarness({ headersSent: true });
        harness.next.handle.mockReturnValue(of('ok'));

        await lastValueFrom(new LoggingInterceptor(harness.logger).intercept(harness.context, harness.next));
        expect(harness.response.setHeader).not.toHaveBeenCalled();
    });
});

function delayedContext(delayMs: number, observed: string[]): Observable<string> {
    return new Observable(subscriber => {
        const timer = setTimeout(() => {
            observed.push(LoggerServiceImpl.getRequestContext()?.requestId ?? 'missing');
            subscriber.next('done');
            subscriber.complete();
        }, delayMs);
        return () => clearTimeout(timer);
    });
}

function createHarness(
    input: {
        request?: Partial<Request> & { headers?: Request['headers']; route?: unknown };
        responseHeaders?: Record<string, string>;
        headersSent?: boolean;
    } = {},
) {
    const responseHeaders = new Map(Object.entries(input.responseHeaders ?? {}));
    const headers = input.request?.headers ?? {};
    const request = {
        method: 'GET',
        originalUrl: '/resources',
        url: '/resources',
        path: '/resources',
        baseUrl: '',
        route: undefined,
        headers,
        body: undefined,
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.2' },
        get: (name: string) => {
            const value = headers[name.toLowerCase()];
            return Array.isArray(value) ? value[0] : value;
        },
        ...input.request,
    } as unknown as Request;
    const response = {
        statusCode: 200,
        headersSent: input.headersSent ?? false,
        getHeader: jest.fn((name: string) => responseHeaders.get(name)),
        setHeader: jest.fn((name: string, value: string) => {
            responseHeaders.set(name, value);
            return response;
        }),
    } as unknown as Response & { getHeader: jest.Mock; setHeader: jest.Mock };
    const logger = {
        logRequest: jest.fn(),
        warn: jest.fn(),
    } as unknown as LoggerServiceImpl & { logRequest: jest.Mock; warn: jest.Mock };
    const context = {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as unknown as ExecutionContext;
    const next = { handle: jest.fn() } as unknown as CallHandler & { handle: jest.Mock };
    return { request, response, logger, context, next };
}
