import 'reflect-metadata';
import { validate } from 'class-validator';
import {
    API_SUCCESS_MESSAGE,
    API_SUCCESS_STATUS,
    ApiResponseDto,
    ApiResponseService,
    BusinessException,
    IsInRange,
    IsJsonString,
    IsSlug,
    IsStrongPassword,
    SearchQueryDto,
    StatusCode,
    attachCorrelationIdHeader,
    attachRequestIdHeader,
    getOrCreateCorrelationId,
    getOrCreateRequestId,
    parsePaginationOptions,
    toPaginatedResponse,
} from '../index';

describe('http api helpers', () => {
    it('extracts and attaches request identifiers', () => {
        const request = { headers: { 'x-request-id': 'req-1' } };
        const headers = new Map<string, string>();
        const response = {
            headersSent: false,
            setHeader: (name: string, value: string) => headers.set(name, value),
        };

        const requestId = getOrCreateRequestId(request);
        const correlationId = getOrCreateCorrelationId({ headers: { 'x-correlation-id': 'corr-1' } }, requestId);
        attachRequestIdHeader(response, requestId);
        attachCorrelationIdHeader(response, correlationId);

        expect(requestId).toBe('req-1');
        expect(correlationId).toBe('corr-1');
        expect(headers.get('x-request-id')).toBe('req-1');
        expect(headers.get('x-correlation-id')).toBe('corr-1');
    });

    it('creates success, error, and pagination envelopes', () => {
        const service = new ApiResponseService();

        expect(service.success({ ok: true }, undefined, 'req-1')).toMatchObject({
            code: 200,
            status: API_SUCCESS_STATUS,
            message: API_SUCCESS_MESSAGE,
            data: { ok: true },
            requestId: 'req-1',
        });
        expect(service.error(StatusCode.RESOURCE_NOT_FOUND, undefined, undefined, 'req-1')).toMatchObject({
            code: 404,
            status: StatusCode.RESOURCE_NOT_FOUND,
            requestId: 'req-1',
        });
        expect(service.paginated(['a'], 21, 2, 10)).toMatchObject({
            totalPages: 3,
            hasNext: true,
            hasPrevious: true,
        });
    });

    it('keeps explicit ApiResponseDto defaults stable', () => {
        const response = new ApiResponseDto({ code: 202, data: 'accepted' });

        expect(response.status).toBe(API_SUCCESS_STATUS);
        expect(response.message).toBe(API_SUCCESS_MESSAGE);
        expect(response.timestamp).toBeDefined();
    });

    it('maps business exceptions to HTTP status and response shape', () => {
        const exception = new BusinessException({
            code: StatusCode.BUSINESS_RULE_VIOLATION,
            message: 'rule failed',
            details: { field: 'quantity' },
        });

        expect(exception.getStatus()).toBe(400);
        expect(exception.getResponse()).toEqual({
            status: StatusCode.BUSINESS_RULE_VIOLATION,
            message: 'rule failed',
            details: { field: 'quantity' },
        });
    });

    it('derives pagination offsets and page metadata', () => {
        expect(parsePaginationOptions({ page: 3, limit: 20 })).toEqual({ page: 3, limit: 20, offset: 40 });
        expect(toPaginatedResponse({ items: [], total: 0, page: 1, limit: 10 })).toMatchObject({
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
        });
    });

    it('exports common OpenAPI DTOs', () => {
        const query = new SearchQueryDto();
        query.q = 'orders';
        query.page = 2;
        query.pageSize = 20;

        expect(query).toMatchObject({ q: 'orders', page: 2, pageSize: 20 });
    });

    it('validates reusable custom decorators', async () => {
        class Input {
            @IsStrongPassword()
            password!: string;

            @IsSlug()
            slug!: string;

            @IsJsonString()
            payload!: string;

            @IsInRange(1, 10)
            count!: number;
        }

        const valid = Object.assign(new Input(), {
            password: 'Strong1!',
            slug: 'valid-slug',
            payload: '{"ok":true}',
            count: 5,
        });
        const invalid = Object.assign(new Input(), {
            password: 'weak',
            slug: 'Invalid Slug',
            payload: 'nope',
            count: 11,
        });

        expect(await validate(valid)).toHaveLength(0);
        expect(await validate(invalid)).toHaveLength(4);
    });
});
