// ============================================================================
// API Response Interceptor - Wrap all responses in ApiResponseDto
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponseDto } from './api-response.dto';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const requestId =
            (request.headers['x-request-id'] as string) ||
            (request.headers['x-correlation-id'] as string);

        return next.handle().pipe(
            map((data) => {
                // If already wrapped in ApiResponseDto, return as is
                if (data instanceof ApiResponseDto) {
                    return data;
                }

                // Return wrapped response
                return new ApiResponseDto({
                    code: 200,
                    message: 'Success',
                    data,
                    requestId,
                    timestamp: new Date().toISOString(),
                });
            }),
        );
    }
}
