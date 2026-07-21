import { randomUUID } from 'node:crypto';
import { normalizeHttpText } from './http-boundary';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const DEFAULT_REQUEST_ID_MAX_LENGTH = 128;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+\-=]{0,127}$/;

export interface RequestIdCarrier {
    headers?: Record<string, string | string[] | undefined>;
    id?: string;
}

export interface ResponseHeaderCarrier {
    headersSent?: boolean;
    setHeader?: (name: string, value: string) => unknown;
}

export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function normalizeRequestId(value: unknown): string | undefined {
    const normalized = normalizeHttpText(value, {
        maxLength: DEFAULT_REQUEST_ID_MAX_LENGTH,
        preserveEmpty: true,
    });
    return REQUEST_ID_PATTERN.test(normalized) ? normalized : undefined;
}

export function getOrCreateRequestId(request: RequestIdCarrier): string {
    const requestId =
        readRequestHeader(request, REQUEST_ID_HEADER) ??
        readRequestHeader(request, CORRELATION_ID_HEADER) ??
        normalizeRequestId(request.id) ??
        randomUUID();

    request.id = requestId;
    return requestId;
}

export function getOrCreateCorrelationId(request: RequestIdCarrier, fallback?: string): string {
    return (
        readRequestHeader(request, CORRELATION_ID_HEADER) ??
        normalizeRequestId(fallback) ??
        normalizeRequestId(request.id) ??
        getOrCreateRequestId(request)
    );
}

export function attachRequestIdHeader(response: ResponseHeaderCarrier, requestId: string): void {
    attachIdentifierHeader(response, REQUEST_ID_HEADER, requestId);
}

export function attachCorrelationIdHeader(response: ResponseHeaderCarrier, correlationId: string): void {
    attachIdentifierHeader(response, CORRELATION_ID_HEADER, correlationId);
}

function attachIdentifierHeader(response: ResponseHeaderCarrier, name: string, value: string): void {
    const normalized = normalizeRequestId(value);
    if (!response.headersSent && normalized && typeof response.setHeader === 'function') {
        response.setHeader(name, normalized);
    }
}

function readRequestHeader(request: RequestIdCarrier, name: string): string | undefined {
    if (!request.headers) {
        return undefined;
    }
    const matchingKey = Object.keys(request.headers).find(key => key.toLowerCase() === name);
    const value = matchingKey ? request.headers[matchingKey] : undefined;
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
        const normalized = normalizeRequestId(candidate);
        if (normalized) {
            return normalized;
        }
    }
    return undefined;
}
