import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { LoggerServiceImpl } from './logger.service';
import { LogInterceptorOptions } from './logger.types';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly defaultOptions: Required<LogInterceptorOptions> = {
        excludePaths: ['/health', '/healthz', '/ready', '/metrics'],
        logRequestBody: false,
        logResponseBody: false,
        logRequestHeaders: false,
    };

    constructor(
        private readonly logger: LoggerServiceImpl,
        private readonly options: LogInterceptorOptions = {},
    ) {
        this.options = { ...this.defaultOptions, ...options };
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { method, url, headers, body } = request;
        const requestId = (headers['x-request-id'] || headers['x-correlation-id'] || randomUUID()) as string;
        const startTime = Date.now();

        // Skip excluded paths
        if (this.isExcludedPath(url)) {
            return next.handle();
        }

        // Set request context
        LoggerServiceImpl.setRequestContext({
            requestId,
            method,
            url,
            userAgent: headers['user-agent'] as string,
            ip: this.getClientIp(request),
            ...(this.options.logRequestHeaders && { headers }),
            ...(this.options.logRequestBody && body && { requestBody: body }),
        });

        const logRequest = () => {
            const statusCode = response.statusCode;
            const responseTime = Date.now() - startTime;

            this.logger.logRequest({
                method,
                url,
                requestId,
                startTime,
                statusCode,
            });
        };

        return next.handle().pipe(
            tap(() => {
                logRequest();
            }),
            catchError(error => {
                logRequest();
                this.logger.error(error, {
                    requestId,
                    method,
                    url,
                    statusCode: error.status || 500,
                });
                throw error;
            }),
        );
    }

    private isExcludedPath(url: string): boolean {
        return this.options.excludePaths.some(path => url === path || url.startsWith(path + '/'));
    }

    private getClientIp(request: Request): string {
        return (
            (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            (request.headers['x-real-ip'] as string) ||
            request.socket?.remoteAddress ||
            'unknown'
        );
    }
}
