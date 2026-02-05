import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const now = Date.now();

        this.logger.log(`Incoming Request: ${method} ${url}`);

        return next.handle().pipe(
            tap(() => {
                const response = context.switchToHttp().getResponse();
                const { statusCode } = response;
                const delay = Date.now() - now;
                this.logger.log(`Outgoing Response: ${method} ${url} ${statusCode} - ${delay}ms`);
            }),
        );
    }
}
