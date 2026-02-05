import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

export class DomainException extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DomainExceptionFilter.name);

    catch(exception: DomainException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

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
