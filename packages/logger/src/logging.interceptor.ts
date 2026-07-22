import { randomUUID } from 'node:crypto';
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize, Observable, tap } from 'rxjs';
import { LoggerServiceImpl } from './logger.service';
import type { LogContext, LogInterceptorOptions, NormalizedLogInterceptorOptions } from './logger.types';
import { normalizeLogInterceptorOptions } from './logger-options';

const MAX_LOGGED_HEADERS = 64;
const MAX_LOGGED_HEADER_VALUES = 16;
const MAX_LOGGED_HEADER_LENGTH = 1_024;
const MAX_CLIENT_FIELD_LENGTH = 512;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly options: NormalizedLogInterceptorOptions;

    constructor(
        private readonly logger: LoggerServiceImpl,
        options: LogInterceptorOptions = {},
    ) {
        this.options = normalizeLogInterceptorOptions(options);
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const method = boundedText(request.method, 32) ?? 'UNKNOWN';
        const url = requestPath(request);
        const route = requestRoute(request);
        const requestId = this.resolveRequestId(request);
        const excluded = this.isExcludedPath(url);
        const clientAgent = boundedText(request.get?.('user-agent'), MAX_CLIENT_FIELD_LENGTH);
        const clientIp = this.getClientIp(request);
        const requestHeaders = this.options.logRequestHeaders ? sanitizeHeaders(request.headers) : undefined;
        const requestContext: LogContext = {
            requestId,
            method,
            url,
            ...(route && { route }),
            ...(clientAgent && { clientAgent }),
            ...(clientIp && { ip: clientIp }),
            ...(requestHeaders && { requestHeaders }),
            ...(this.options.logRequestBody && request.body !== undefined && { requestBody: request.body }),
        };
        this.setResponseRequestId(response, requestId);

        return new Observable(subscriber =>
            LoggerServiceImpl.runWithContext(requestContext, () => {
                const startedAt = process.hrtime.bigint();
                let responseBody: unknown;
                let capturedError: unknown;
                let logged = false;
                const logRequest = () => {
                    if (logged || excluded) {
                        return;
                    }
                    logged = true;
                    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
                    const statusCode =
                        capturedError === undefined
                            ? response.statusCode
                            : errorStatus(capturedError, response.statusCode);
                    this.logger.logRequest({
                        method,
                        url,
                        requestId,
                        durationMs,
                        statusCode,
                        error: capturedError,
                        ...(requestHeaders && { headers: requestHeaders }),
                        ...(this.options.logRequestBody && request.body !== undefined && { body: request.body }),
                        ...(this.options.logResponseBody && responseBody !== undefined && { responseBody }),
                        ...(route && { context: { route } }),
                    });
                };

                let source: Observable<unknown>;
                try {
                    source = next.handle();
                } catch (error) {
                    capturedError = error;
                    logRequest();
                    subscriber.error(error);
                    return undefined;
                }

                const subscription = source
                    .pipe(
                        tap({
                            next: value => {
                                if (this.options.logResponseBody) {
                                    responseBody = value;
                                }
                            },
                            error: error => {
                                capturedError = error;
                            },
                        }),
                        finalize(logRequest),
                    )
                    .subscribe(subscriber);
                return () => subscription.unsubscribe();
            }),
        );
    }

    private resolveRequestId(request: Request): string {
        for (const headerName of this.options.requestIdHeaders) {
            const candidate = firstHeaderValue(request.headers[headerName]);
            if (isSafeRequestId(candidate, this.options.maxRequestIdLength)) {
                return candidate;
            }
        }
        return randomUUID();
    }

    private setResponseRequestId(response: Response, requestId: string): void {
        const headerName = this.options.responseRequestIdHeader;
        if (headerName === false || response.headersSent) {
            return;
        }
        try {
            if (response.getHeader(headerName) !== undefined) {
                return;
            }
            response.setHeader(headerName, requestId);
        } catch (error) {
            this.logger.warn('Unable to set the response request id header', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private isExcludedPath(url: string): boolean {
        return this.options.excludePaths.some(path => path === '/' || url === path || url.startsWith(`${path}/`));
    }

    private getClientIp(request: Request): string | undefined {
        return boundedText(request.ip || request.socket?.remoteAddress, MAX_CLIENT_FIELD_LENGTH);
    }
}

function requestPath(request: Request): string {
    const value = request.originalUrl || request.url || request.path || '/';
    const query = value.indexOf('?');
    const fragment = value.indexOf('#');
    const boundary = [query, fragment].filter(index => index >= 0).sort((left, right) => left - right)[0];
    const path = boundary === undefined ? value : value.slice(0, boundary);
    return boundedText(path, 2_048) || '/';
}

function requestRoute(request: Request): string | undefined {
    const routePath = (request.route as { path?: unknown } | undefined)?.path;
    if (typeof routePath !== 'string') {
        return undefined;
    }
    return boundedText(`${request.baseUrl ?? ''}${routePath}`, 1_024);
}

function sanitizeHeaders(headers: Request['headers']): Record<string, string | string[]> {
    const sanitized: Record<string, string | string[]> = {};
    for (const [name, value] of Object.entries(headers).slice(0, MAX_LOGGED_HEADERS)) {
        if (value === undefined) {
            continue;
        }
        sanitized[name] = Array.isArray(value)
            ? value.slice(0, MAX_LOGGED_HEADER_VALUES).map(item => truncate(item, MAX_LOGGED_HEADER_LENGTH))
            : truncate(value, MAX_LOGGED_HEADER_LENGTH);
    }
    return sanitized;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

function isSafeRequestId(value: string | undefined, maxLength: number): value is string {
    if (!value || value.length > maxLength || value.trim() !== value) {
        return false;
    }
    for (const character of value) {
        const code = character.charCodeAt(0);
        if (code < 33 || code > 126) {
            return false;
        }
    }
    return true;
}

function errorStatus(error: unknown, responseStatus: number): number {
    if (typeof error === 'object' && error !== null) {
        const candidate =
            (error as { status?: unknown; statusCode?: unknown }).statusCode ?? (error as { status?: unknown }).status;
        if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
            return candidate;
        }
    }
    return Number.isInteger(responseStatus) && responseStatus >= 400 && responseStatus <= 599 ? responseStatus : 500;
}

function boundedText(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }
    return truncate(value.replace(/[\r\n]/gu, ''), maxLength);
}

function truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
