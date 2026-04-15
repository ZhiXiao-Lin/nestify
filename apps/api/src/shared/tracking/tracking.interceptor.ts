// ============================================================================
// Tracking Interceptor - Request ID and Correlation ID injection
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for request context
export const trackingStorage = new AsyncLocalStorage<TrackingContext>();

export interface TrackingContext {
    requestId: string;
    correlationId?: string;
    userId?: string;
    organizationId?: string;
    startTime: number;
}

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Get or generate request ID
        const requestId =
            (request.headers['x-request-id'] as string) ||
            (request.headers['x-correlation-id'] as string) ||
            uuidv4();

        // Get correlation ID (for distributed tracing)
        const correlationId = (request.headers['x-correlation-id'] as string) || requestId;

        // Set headers for downstream services
        response.setHeader('x-request-id', requestId);
        response.setHeader('x-correlation-id', correlationId);

        // Extract user context if available
        const userId = request.user?.id;
        const organizationId = request.user?.organizationId;

        const trackingContext: TrackingContext = {
            requestId,
            correlationId,
            userId,
            organizationId,
            startTime: Date.now(),
        };

        // Store in async local storage
        trackingStorage.run(trackingContext, () => {
            return next.handle();
        });

        return next.handle();
    }
}

// Helper to get current tracking context
export function getTrackingContext(): TrackingContext | undefined {
    return trackingStorage.getStore();
}

// Helper to get request ID
export function getRequestId(): string | undefined {
    return trackingStorage.getStore()?.requestId;
}

// Helper to get correlation ID
export function getCorrelationId(): string | undefined {
    return trackingStorage.getStore()?.correlationId;
}
