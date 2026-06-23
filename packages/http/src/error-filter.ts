import { ArgumentsHost, Catch, ExceptionFilter, Global, HttpException, Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DomainValidationError } from '@a3s-lab/ddd';
import type { Request, Response } from 'express';
import { BusinessException, getStatusMessage, StatusCode, StatusCodeHttpStatus } from './exceptions';
import { DomainException } from './presentation';
import { attachRequestIdHeader, getOrCreateRequestId } from './request-id';

interface ErrorResponse {
    code: number;
    status: StatusCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalErrorFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        let errorResponse: ErrorResponse;
        let normalized = exception;

        if (normalized instanceof DomainValidationError) {
            normalized = new BusinessException({
                code: StatusCode.VALIDATION_ERROR,
                message: normalized.message,
                details: normalized.details,
            });
        }

        if (normalized instanceof DomainException) {
            normalized = new BusinessException({
                code: StatusCode.BUSINESS_RULE_VIOLATION,
                message: normalized.message,
                details: { type: normalized.name },
            });
        }

        if (normalized instanceof BusinessException) {
            const status = StatusCodeHttpStatus[normalized.code] ?? 500;
            errorResponse = {
                code: status,
                status: normalized.code,
                message: normalized.message,
                details: normalized.details,
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.warn(`[${errorResponse.code}] ${errorResponse.message}`, {
                requestId,
                path: request.url,
                method: request.method,
            });
        } else if (normalized instanceof HttpException) {
            const status = normalized.getStatus();
            const exceptionResponse = normalized.getResponse();
            const code = this.getStatusCode(status, exceptionResponse);
            errorResponse = {
                code: status,
                status: code,
                message: this.extractMessage(exceptionResponse, code),
                details: this.extractDetails(exceptionResponse),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logByStatus(status, errorResponse.message, normalized, request, requestId);
        } else if (normalized instanceof Error) {
            errorResponse = {
                code: 500,
                status: StatusCode.INTERNAL_SERVER_ERROR,
                message: getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.error(`[500] ${normalized.message}`, normalized.stack, {
                requestId,
                path: request.url,
                method: request.method,
            });
        } else {
            errorResponse = {
                code: 500,
                status: StatusCode.INTERNAL_SERVER_ERROR,
                message: getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR),
                requestId,
                timestamp: new Date().toISOString(),
            };
            this.logger.error('[500] Unknown exception', normalized as Error, {
                requestId,
                path: request.url,
                method: request.method,
            });
        }

        response.status(errorResponse.code).json(errorResponse);
    }

    private getStatusCode(status: number, exceptionResponse: unknown): StatusCode {
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const maybeStatus = (exceptionResponse as Record<string, unknown>).status;
            if (typeof maybeStatus === 'string' && maybeStatus in StatusCode) {
                return maybeStatus as StatusCode;
            }
        }
        const statusToCode: Record<number, StatusCode> = {
            400: StatusCode.BAD_REQUEST,
            401: StatusCode.UNAUTHORIZED,
            403: StatusCode.FORBIDDEN,
            404: StatusCode.NOT_FOUND,
            409: StatusCode.CONFLICT,
            422: StatusCode.UNPROCESSABLE_ENTITY,
            429: StatusCode.TOO_MANY_REQUESTS,
            500: StatusCode.INTERNAL_SERVER_ERROR,
            502: StatusCode.EXTERNAL_SERVICE_ERROR,
            503: StatusCode.SERVICE_UNAVAILABLE,
            504: StatusCode.GATEWAY_TIMEOUT,
        };
        return statusToCode[status] || StatusCode.INTERNAL_SERVER_ERROR;
    }

    private extractMessage(exceptionResponse: unknown, code: StatusCode): string {
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const message = (exceptionResponse as Record<string, unknown>).message;
            if (typeof message === 'string') {
                return message;
            }
            if (Array.isArray(message)) {
                return getStatusMessage(code);
            }
        }
        if (typeof exceptionResponse === 'string') {
            return exceptionResponse;
        }
        return getStatusMessage(code);
    }

    private extractDetails(exceptionResponse: unknown): Record<string, unknown> | undefined {
        if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
            return undefined;
        }
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.fieldErrors)) {
            return { fieldErrors: resp.fieldErrors };
        }
        if (Array.isArray(resp.errors)) {
            return { fieldErrors: resp.errors };
        }
        if (resp.details && typeof resp.details === 'object' && !Array.isArray(resp.details)) {
            return resp.details as Record<string, unknown>;
        }
        if (Array.isArray(resp.message)) {
            return { messages: resp.message };
        }
        return undefined;
    }

    private logByStatus(
        status: number,
        message: string,
        exception: HttpException,
        request: Request,
        requestId: string,
    ): void {
        const context = { requestId, path: request.url, method: request.method };
        if (status >= 500) {
            this.logger.error(`[${status}] ${message}`, exception.stack, context);
        } else {
            this.logger.warn(`[${status}] ${message}`, context);
        }
    }
}

@Global()
@Module({
    providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class ErrorsModule {}
