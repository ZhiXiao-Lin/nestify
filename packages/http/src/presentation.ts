import {
    ArgumentsHost,
    CallHandler,
    Catch,
    ExceptionFilter,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export class DomainException extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        const captureStackTrace = (
            Error as ErrorConstructor & {
                captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
            }
        ).captureStackTrace;
        captureStackTrace?.(this, this.constructor);
    }
}

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DomainExceptionFilter.name);

    catch(exception: DomainException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const errorResponse = {
            statusCode: HttpStatus.BAD_REQUEST,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message,
            type: exception.name,
        };

        this.logger.error(`Domain Exception: ${exception.name} - ${exception.message}`);
        response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    }
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: extractHttpExceptionMessage(exceptionResponse, exception.message),
        };

        this.logger.error(`${request.method} ${request.url} ${status} - ${JSON.stringify(errorResponse.message)}`);
        response.status(status).json(errorResponse);
    }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url } = request;
        const startedAt = Date.now();

        this.logger.log(`Incoming Request: ${method} ${url}`);

        return next.handle().pipe(
            tap(() => {
                const response = context.switchToHttp().getResponse<Response>();
                const delay = Date.now() - startedAt;
                this.logger.log(`Outgoing Response: ${method} ${url} ${response.statusCode} - ${delay}ms`);
            }),
        );
    }
}

function extractHttpExceptionMessage(exceptionResponse: unknown, fallback: string): string | string[] {
    if (typeof exceptionResponse === 'string') {
        return exceptionResponse;
    }
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const message = (exceptionResponse as Record<string, unknown>).message;
        if (
            typeof message === 'string' ||
            (Array.isArray(message) && message.every(item => typeof item === 'string'))
        ) {
            return message;
        }
    }
    return fallback;
}
