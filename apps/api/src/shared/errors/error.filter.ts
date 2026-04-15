// ============================================================================
// Global Error Filter - Handle all exceptions and format error responses
// ============================================================================

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from './business.exception';
import { ErrorCode } from './error-codes';

interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
    path?: string;
    method?: string;
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalErrorFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const requestId =
            (request.headers['x-request-id'] as string) ||
            (request.headers['x-correlation-id'] as string);

        let errorResponse: ErrorResponse;

        if (exception instanceof BusinessException) {
            errorResponse = {
                code: exception.code,
                message: exception.message,
                details: exception.details,
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            };

            this.logger.warn(
                `[${errorResponse.code}] ${errorResponse.message}`,
                {
                    requestId,
                    path: request.url,
                    method: request.method,
                },
            );
        } else if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse as Record<string, unknown>;
                errorResponse = {
                    code: this.getErrorCode(status),
                    message: (resp.message as string) || exception.message,
                    details: resp.errors as Record<string, unknown>,
                    requestId,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    method: request.method,
                };
            } else {
                errorResponse = {
                    code: this.getErrorCode(status),
                    message: exception.message,
                    requestId,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    method: request.method,
                };
            }

            if (status >= 500) {
                this.logger.error(
                    `[${errorResponse.code}] ${errorResponse.message}`,
                    exception instanceof Error ? exception.stack : undefined,
                    { requestId, path: request.url, method: request.method },
                );
            } else {
                this.logger.warn(
                    `[${errorResponse.code}] ${errorResponse.message}`,
                    { requestId, path: request.url, method: request.method },
                );
            }
        } else if (exception instanceof Error) {
            errorResponse = {
                code: ErrorCode.INTERNAL_SERVER_ERROR,
                message:
                    process.env.NODE_ENV === 'production'
                        ? 'Internal server error'
                        : exception.message,
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            };

            this.logger.error(
                `[${errorResponse.code}] ${exception.message}`,
                exception.stack,
                { requestId, path: request.url, method: request.method },
            );
        } else {
            errorResponse = {
                code: ErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
                requestId,
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            };

            this.logger.error(
                `[${errorResponse.code}] Unknown exception`,
                exception as Error,
                { requestId, path: request.url, method: request.method },
            );
        }

        response.status(errorResponse.code.startsWith('2') ? 200 : (exception instanceof HttpException ? exception.getStatus() : 500)).json({
            code: errorResponse.code,
            message: errorResponse.message,
            details: errorResponse.details,
            requestId: errorResponse.requestId,
            timestamp: errorResponse.timestamp,
        });
    }

    private getErrorCode(status: number): string {
        const statusToCode: Record<number, ErrorCode> = {
            400: ErrorCode.BAD_REQUEST,
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            409: ErrorCode.CONFLICT,
            422: ErrorCode.UNPROCESSABLE_ENTITY,
            429: ErrorCode.TOO_MANY_REQUESTS,
            500: ErrorCode.INTERNAL_SERVER_ERROR,
            502: ErrorCode.EXTERNAL_SERVICE_ERROR,
            503: ErrorCode.SERVICE_UNAVAILABLE,
            504: ErrorCode.GATEWAY_TIMEOUT,
        };

        return statusToCode[status] || ErrorCode.INTERNAL_SERVER_ERROR;
    }
}
