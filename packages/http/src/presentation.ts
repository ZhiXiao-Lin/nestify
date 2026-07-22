import {
    type ArgumentsHost,
    type CallHandler,
    Catch,
    type ExceptionFilter,
    type ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { defer, type Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { getStatusMessage, StatusCode } from './exceptions';
import { getSafeRequestMethod, getSafeRequestPath, normalizeHttpStatus, normalizeHttpText } from './http-boundary';
import { attachRequestIdHeader, getOrCreateRequestId } from './request-id';

export class DomainException extends Error {
    constructor(message: string) {
        super(normalizeHttpText(message, { fallback: 'Domain operation failed', maxLength: 1_024 }));
        this.name = this.constructor.name;
        const captureStackTrace = (
            Error as ErrorConstructor & {
                captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
            }
        ).captureStackTrace;
        captureStackTrace?.(this, this.constructor);
    }
}

/** @deprecated Prefer `GlobalErrorFilter` through `ErrorsModule`. */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DomainExceptionFilter.name);

    catch(exception: DomainException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        if (response.headersSent) {
            return;
        }
        const requestId = getOrCreateRequestId(request);
        const path = getSafeRequestPath(request);
        const method = getSafeRequestMethod(request);
        attachRequestIdHeader(response, requestId);

        const errorResponse = {
            statusCode: HttpStatus.BAD_REQUEST,
            timestamp: new Date().toISOString(),
            path,
            method,
            message: normalizeHttpText(exception.message, { fallback: 'Domain operation failed', maxLength: 1_024 }),
            type: normalizeHttpText(exception.name, { fallback: 'DomainException', maxLength: 128 }),
            requestId,
        };

        this.logger.warn(`Domain exception: ${errorResponse.type}`, { requestId, path, method });
        response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    }
}

/** @deprecated Prefer `GlobalErrorFilter` through `ErrorsModule`. */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        if (response.headersSent) {
            return;
        }
        const status = normalizeHttpStatus(exception.getStatus());
        const requestId = getOrCreateRequestId(request);
        const path = getSafeRequestPath(request);
        const method = getSafeRequestMethod(request);
        attachRequestIdHeader(response, requestId);
        const message =
            status >= 500
                ? getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR)
                : extractHttpExceptionMessage(exception.getResponse(), exception.message);

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path,
            method,
            message,
            requestId,
        };

        const logMessage = `${method} ${path} ${status}`;
        if (status >= 500) {
            this.logger.error(logMessage, exception.stack, { requestId, path, method });
        } else {
            this.logger.warn(logMessage, { requestId, path, method });
        }
        response.status(status).json(errorResponse);
    }
}

/** @deprecated Prefer `@a3s-lab/logger` for configurable structured request logging. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const method = getSafeRequestMethod(request);
        const path = getSafeRequestPath(request);
        const requestId = getOrCreateRequestId(request);
        attachRequestIdHeader(response, requestId);

        let status = normalizeHttpStatus(response.statusCode, 200);
        let failed = false;
        const startedAt = process.hrtime.bigint();

        return defer(() => {
            this.logger.log(`Incoming request: ${method} ${path}`, { requestId });
            return next.handle();
        }).pipe(
            tap({
                error: (error: unknown) => {
                    failed = true;
                    status = error instanceof HttpException ? normalizeHttpStatus(error.getStatus()) : 500;
                },
            }),
            finalize(() => {
                if (!failed) {
                    status = normalizeHttpStatus(response.statusCode, status);
                }
                const duration = Number(process.hrtime.bigint() - startedAt) / 1e6;
                const message = `Outgoing response: ${method} ${path} ${status} - ${duration.toFixed(2)}ms`;
                const logContext = { requestId, failed };
                if (failed) {
                    this.logger.warn(message, logContext);
                } else {
                    this.logger.log(message, logContext);
                }
            }),
        );
    }
}

function extractHttpExceptionMessage(exceptionResponse: unknown, fallback: string): string | string[] {
    if (typeof exceptionResponse === 'string') {
        return normalizeHttpText(exceptionResponse, { fallback, maxLength: 1_024 });
    }
    if (isRecord(exceptionResponse)) {
        const message = exceptionResponse.message;
        if (typeof message === 'string') {
            return normalizeHttpText(message, { fallback, maxLength: 1_024 });
        }
        if (Array.isArray(message)) {
            const normalized = message
                .filter((item): item is string => typeof item === 'string')
                .slice(0, 64)
                .map(item => normalizeHttpText(item, { maxLength: 1_024 }));
            if (normalized.length > 0) {
                return normalized;
            }
        }
    }
    return normalizeHttpText(fallback, { fallback: 'Request failed', maxLength: 1_024 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
