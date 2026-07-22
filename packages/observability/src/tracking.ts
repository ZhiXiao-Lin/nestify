import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import {
    attachCorrelationIdHeader,
    attachRequestIdHeader,
    getOrCreateCorrelationId,
    getOrCreateRequestId,
} from '@a3s-lab/http';
import { CallHandler, ExecutionContext, Global, Injectable, Module, NestInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { externalCallCollectorStorage } from './external-call';
import { sqlQueryCollectorStorage } from './sql-collector';

export const trackingStorage = new AsyncLocalStorage<TrackingContext>();
const MAX_TRACKING_ID_LENGTH = 256;
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$/;

export interface TrackingContext {
    requestId: string;
    correlationId?: string;
    actorId?: string;
    subjectId?: string;
    startTime: number;
}

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (typeof context.getType === 'function' && context.getType() !== 'http') return next.handle();
        const request = context.switchToHttp().getRequest<
            Request & {
                actor?: Record<string, unknown>;
                id?: string;
                principal?: Record<string, unknown>;
                user?: Record<string, unknown>;
            }
        >();
        const response = context.switchToHttp().getResponse<Response>();

        const requestId = normalizeRequestIdentifier(getOrCreateRequestId(request)) ?? randomUUID();
        request.id = requestId;
        const correlationId = normalizeRequestIdentifier(getOrCreateCorrelationId(request, requestId)) ?? requestId;
        attachRequestIdHeader(response, requestId);
        attachCorrelationIdHeader(response, correlationId);

        const principal = firstOwnRecord(request, 'principal', 'actor', 'user');
        const trackingContext: TrackingContext = Object.freeze({
            requestId,
            correlationId,
            actorId: firstOwnString(principal, 'actorId', 'id', 'sub'),
            subjectId: firstOwnString(principal, 'subjectId'),
            startTime: Date.now(),
        });

        return new Observable(subscriber => {
            return trackingStorage.run(trackingContext, () =>
                sqlQueryCollectorStorage.run([], () =>
                    externalCallCollectorStorage.run([], () => next.handle().subscribe(subscriber)),
                ),
            );
        });
    }
}

@Global()
@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: TrackingInterceptor }],
})
export class TrackingModule {}

export function getTrackingContext(): TrackingContext | undefined {
    const context = trackingStorage.getStore();
    return context ? { ...context } : undefined;
}

export function getRequestId(): string | undefined {
    return trackingStorage.getStore()?.requestId;
}

export function getCorrelationId(): string | undefined {
    return trackingStorage.getStore()?.correlationId;
}

function firstOwnRecord(value: object, ...keys: string[]): Record<string, unknown> {
    for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor && 'value' in descriptor && isRecord(descriptor.value)) return descriptor.value;
    }
    return {};
}

function firstOwnString(value: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !('value' in descriptor)) continue;
        const candidate = descriptor.value;
        const first = Array.isArray(candidate) ? candidate[0] : candidate;
        if (typeof first === 'string') {
            const normalized = first.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
            if (normalized) return normalized.slice(0, MAX_TRACKING_ID_LENGTH);
        }
    }
    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRequestIdentifier(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (normalized.length > MAX_REQUEST_ID_LENGTH || !REQUEST_ID_PATTERN.test(normalized)) return undefined;
    return normalized;
}
