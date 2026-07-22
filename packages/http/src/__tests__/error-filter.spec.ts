import { HttpStatus, InternalServerErrorException, Logger } from '@nestjs/common';
import {
    BusinessException,
    createErrorFilterOptions,
    ErrorsModule,
    GlobalErrorFilter,
    HttpConfigurationError,
    StatusCode,
} from '../index';

describe('GlobalErrorFilter boundaries', () => {
    beforeEach(() => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('hides arbitrary 5xx status, message, and details by default', () => {
        const response = createResponse();
        const filter = new GlobalErrorFilter();

        filter.catch(
            new InternalServerErrorException({
                status: StatusCode.VALIDATION_ERROR,
                message: 'database password leaked',
                details: { password: 'secret' },
            }),
            createHost(response, '/orders?token=secret'),
        );

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 500,
                status: StatusCode.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
            }),
        );
        expect(response.json.mock.calls[0][0].details).toBeUndefined();
        expect(Logger.prototype.error).toHaveBeenCalledWith(
            expect.stringContaining('[500] Internal server error'),
            expect.anything(),
            expect.objectContaining({ path: '/orders' }),
        );
    });

    it('can deliberately expose normalized 5xx details', () => {
        const response = createResponse();
        const filter = new GlobalErrorFilter({ exposeHttp5xxMessages: true });

        filter.catch(
            new InternalServerErrorException({
                status: StatusCode.EXTERNAL_SERVICE_ERROR,
                message: 'upstream\nfailed',
                details: { service: 'billing' },
            }),
            createHost(response),
        );

        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: StatusCode.EXTERNAL_SERVICE_ERROR,
                message: 'upstream failed',
                details: { service: 'billing' },
            }),
        );
    });

    it('honors BusinessException status and optional detail suppression', () => {
        const response = createResponse();
        const filter = new GlobalErrorFilter({ includeDetails: false });

        filter.catch(
            new BusinessException({
                code: StatusCode.OPERATION_FAILED,
                message: 'retry later',
                details: { retryAfter: 2 },
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
            }),
            createHost(response),
        );

        expect(response.status).toHaveBeenCalledWith(503);
        expect(response.json.mock.calls[0][0]).toMatchObject({
            code: 503,
            status: StatusCode.OPERATION_FAILED,
            message: 'retry later',
        });
        expect(response.json.mock.calls[0][0].details).toBeUndefined();
    });

    it('does not write a second response after headers are sent', () => {
        const response = createResponse(true);

        new GlobalErrorFilter().catch(new Error('late failure'), createHost(response));

        expect(response.status).not.toHaveBeenCalled();
        expect(response.setHeader).not.toHaveBeenCalled();
        expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('normalizes unknown thrown values into a stable internal error', () => {
        const response = createResponse();

        new GlobalErrorFilter().catch({ unexpected: true }, createHost(response));

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: StatusCode.INTERNAL_SERVER_ERROR, message: 'Internal server error' }),
        );
    });
});

describe('error filter configuration', () => {
    it('normalizes defaults and rejects non-boolean settings', () => {
        expect(createErrorFilterOptions()).toEqual({
            exposeHttp5xxMessages: false,
            includeDetails: true,
            logStack: true,
        });
        expect(() => createErrorFilterOptions({ includeDetails: 'yes' as never })).toThrow(HttpConfigurationError);
    });

    it('exposes validated sync and async module providers', async () => {
        const syncModule = ErrorsModule.register({ includeDetails: false });
        const asyncModule = ErrorsModule.registerAsync({ useFactory: async () => ({ logStack: false }) });
        const provider = asyncModule.providers?.[0] as { useFactory: () => Promise<unknown> };

        expect(syncModule.providers).toHaveLength(1);
        await expect(provider.useFactory()).resolves.toEqual({
            exposeHttp5xxMessages: false,
            includeDetails: true,
            logStack: false,
        });
        expect(() => ErrorsModule.registerAsync({ useFactory: null } as never)).toThrow(HttpConfigurationError);
    });
});

function createResponse(headersSent = false) {
    const json = jest.fn();
    const response = {
        headersSent,
        setHeader: jest.fn(),
        status: jest.fn(() => ({ json })),
        json,
    };
    return response;
}

function createHost(response: ReturnType<typeof createResponse>, url = '/orders?secret=value') {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ headers: {}, originalUrl: url, url, method: 'POST' }),
            getResponse: () => response,
        }),
    } as never;
}
