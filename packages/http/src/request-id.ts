import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface RequestIdCarrier {
    headers?: Record<string, string | string[] | undefined>;
    id?: string;
}

export interface ResponseHeaderCarrier {
    headersSent?: boolean;
    setHeader(name: string, value: string): unknown;
}

export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function getOrCreateRequestId(request: RequestIdCarrier): string {
    const requestId =
        firstHeaderValue(request.headers?.[REQUEST_ID_HEADER]) ||
        firstHeaderValue(request.headers?.[CORRELATION_ID_HEADER]) ||
        request.id ||
        randomUUID();

    request.id = requestId;
    return requestId;
}

export function getOrCreateCorrelationId(request: RequestIdCarrier, fallback?: string): string {
    return (
        firstHeaderValue(request.headers?.[CORRELATION_ID_HEADER]) ||
        fallback ||
        request.id ||
        getOrCreateRequestId(request)
    );
}

export function attachRequestIdHeader(response: ResponseHeaderCarrier, requestId: string): void {
    if (!response.headersSent) {
        response.setHeader(REQUEST_ID_HEADER, requestId);
    }
}

export function attachCorrelationIdHeader(response: ResponseHeaderCarrier, correlationId: string): void {
    if (!response.headersSent) {
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
    }
}
