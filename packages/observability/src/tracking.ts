import { AsyncLocalStorage } from 'node:async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import {
    attachCorrelationIdHeader,
    attachRequestIdHeader,
    getOrCreateCorrelationId,
    getOrCreateRequestId,
} from '@a3s-lab/http';
import { externalCallCollectorStorage } from './external-call';
import { sqlQueryCollectorStorage } from './sql-collector';

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
        const request = context.switchToHttp().getRequest<Request & { user?: Record<string, unknown> }>();
        const response = context.switchToHttp().getResponse<Response>();

        const requestId = getOrCreateRequestId(request);
        const correlationId = getOrCreateCorrelationId(request, requestId);
        attachRequestIdHeader(response, requestId);
        attachCorrelationIdHeader(response, correlationId);

        const user = request.user ?? {};
        const trackingContext: TrackingContext = {
            requestId,
            correlationId,
            userId: firstString(user.id, user.sub),
            organizationId: firstString(user.organizationId),
            startTime: Date.now(),
        };

        return new Observable(subscriber =>
            trackingStorage.run(trackingContext, () =>
                sqlQueryCollectorStorage.run([], () =>
                    externalCallCollectorStorage.run([], () => next.handle().subscribe(subscriber)),
                ),
            ),
        );
    }
}

export function getTrackingContext(): TrackingContext | undefined {
    return trackingStorage.getStore();
}

export function getRequestId(): string | undefined {
    return trackingStorage.getStore()?.requestId;
}

export function getCorrelationId(): string | undefined {
    return trackingStorage.getStore()?.correlationId;
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        const first = Array.isArray(value) ? value[0] : value;
        if (typeof first === 'string' && first.trim()) {
            return first;
        }
    }
    return undefined;
}
