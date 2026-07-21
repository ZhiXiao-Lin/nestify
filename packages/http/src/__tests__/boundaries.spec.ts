import { HttpStatus } from '@nestjs/common';
import {
    ApiErrorResponseDto,
    ApiResponseService,
    attachRequestIdHeader,
    BusinessException,
    getOrCreateCorrelationId,
    getOrCreateRequestId,
    getSafeRequestMethod,
    getSafeRequestPath,
    HttpConfigurationError,
    normalizeHttpStatus,
    normalizeHttpText,
    normalizePositiveInteger,
    normalizePublicDetails,
    normalizeRequestId,
    parsePaginationOptions,
    StatusCode,
    toPaginatedResponse,
    truncateHttpText,
} from '../index';

describe('HTTP boundary helpers', () => {
    it('sanitizes, bounds, and defaults public text', () => {
        expect(normalizeHttpText('  hello\r\nworld  ')).toBe('hello world');
        expect(normalizeHttpText(42, { fallback: 'fallback' })).toBe('fallback');
        expect(normalizeHttpText('', { fallback: 'fallback' })).toBe('fallback');
        expect(normalizeHttpText('', { preserveEmpty: true })).toBe('');
        expect(truncateHttpText('abcdef', 4)).toBe('abc…');
        expect(() => normalizeHttpText('value', { maxLength: 0 })).toThrow(HttpConfigurationError);
    });

    it('removes query strings and rejects unsafe request methods', () => {
        expect(getSafeRequestPath({ originalUrl: '/orders?token=secret#fragment' })).toBe('/orders');
        expect(getSafeRequestPath({})).toBe('/');
        expect(getSafeRequestMethod({ method: 'post' })).toBe('POST');
        expect(getSafeRequestMethod({ method: 'GET\r\nInjected' })).toBe('UNKNOWN');
    });

    it('normalizes HTTP status and positive integer configuration', () => {
        expect(normalizeHttpStatus(204)).toBe(204);
        expect(normalizeHttpStatus(99, 418)).toBe(418);
        expect(normalizePositiveInteger(undefined, 'limit', 10, 1, 20)).toBe(10);
        expect(() => normalizePositiveInteger(21, 'limit', 10, 1, 20)).toThrow(HttpConfigurationError);
    });

    it('makes arbitrary public details finite and JSON-safe', () => {
        const details: Record<string, unknown> = Object.create(null);
        details.__proto__ = 'safe';
        details.nan = Number.NaN;
        details.big = 2n;
        details.date = new Date('2026-01-01T00:00:00.000Z');
        details.error = new Error('private\nmessage');
        details.self = details;
        details[' duplicate '] = 'one';
        details.duplicate = 'two';

        const normalized = normalizePublicDetails(details);

        expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype);
        expect(Object.hasOwn(normalized, '__proto__')).toBe(true);
        expect(normalized).toMatchObject({
            __proto__: 'safe',
            nan: 'NaN',
            big: '2',
            date: '2026-01-01T00:00:00.000Z',
            error: { name: 'Error', message: 'private message' },
            self: { value: '[Circular]' },
        });
        expect(() => JSON.stringify(normalized)).not.toThrow();
        expect(normalized).toMatchObject({ duplicate: 'one', duplicate_2: 'two' });
        expect(normalizePublicDetails(['not-a-record'])).toBeUndefined();
    });
});

describe('request identifiers', () => {
    it('accepts safe identifiers case-insensitively and scans array values', () => {
        const request = { headers: { 'X-Request-ID': ['bad value', 'req-valid'] } };

        expect(getOrCreateRequestId(request)).toBe('req-valid');
        expect(request).toHaveProperty('id', 'req-valid');
        expect(getOrCreateCorrelationId({ headers: {} }, 'req-valid')).toBe('req-valid');
    });

    it('replaces injected, empty, and overlong identifiers', () => {
        expect(normalizeRequestId('bad\r\nx-header: injected')).toBeUndefined();
        expect(normalizeRequestId('x'.repeat(129))).toBeUndefined();
        expect(normalizeRequestId('')).toBeUndefined();

        const generated = getOrCreateRequestId({ headers: { 'x-request-id': 'bad value' } });
        expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('only writes safe identifiers before headers are sent', () => {
        const setHeader = jest.fn();
        attachRequestIdHeader({ headersSent: false, setHeader }, 'req-1');
        attachRequestIdHeader({ headersSent: false, setHeader }, 'bad value');
        attachRequestIdHeader({ headersSent: true, setHeader }, 'req-2');
        attachRequestIdHeader({ headersSent: false }, 'req-3');

        expect(setHeader).toHaveBeenCalledTimes(1);
        expect(setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    });
});

describe('business response invariants', () => {
    it('honors a validated custom BusinessException HTTP status', () => {
        const exception = new BusinessException({
            code: StatusCode.OPERATION_FAILED,
            message: 'accepted\r\nfor retry',
            httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
        });

        expect(exception.getStatus()).toBe(422);
        expect(exception.message).toBe('accepted for retry');
    });

    it('rejects invalid exception and response status configuration', () => {
        expect(
            () =>
                new BusinessException({
                    code: 'NOPE' as StatusCode,
                    message: 'invalid',
                }),
        ).toThrow(HttpConfigurationError);
        expect(
            () =>
                new BusinessException({
                    code: StatusCode.BAD_REQUEST,
                    message: 'invalid',
                    httpStatus: 999,
                }),
        ).toThrow(HttpConfigurationError);
        expect(() => new ApiResponseService().error('NOPE' as StatusCode)).toThrow(HttpConfigurationError);
    });

    it('normalizes error details at envelope construction time', () => {
        const details: Record<string, unknown> = {};
        details.self = details;
        const envelope = new ApiErrorResponseDto({ message: 'failure\nmessage', details });

        expect(envelope.message).toBe('failure message');
        expect(envelope.details).toEqual({ self: { value: '[Circular]' } });
    });

    it.each([
        [{ page: 0, limit: 10 }, 'page'],
        [{ page: 1.5, limit: 10 }, 'page'],
        [{ page: 1, limit: 0 }, 'limit'],
        [{ page: 1, limit: 101 }, 'limit'],
        [{ page: Number.MAX_SAFE_INTEGER, limit: 100 }, 'offset'],
    ])('rejects invalid pagination %p', (query, expectedMessage) => {
        expect(() => parsePaginationOptions(query)).toThrow(expectedMessage);
    });

    it('rejects malformed paginated results and derives safe metadata', () => {
        expect(() => toPaginatedResponse({ items: [], total: -1, page: 1, limit: 10 })).toThrow(BusinessException);
        expect(() => toPaginatedResponse({ items: null, total: 0, page: 1, limit: 10 } as never)).toThrow(
            BusinessException,
        );
        expect(toPaginatedResponse({ items: ['one'], total: 11, page: 2, limit: 10 })).toMatchObject({
            totalPages: 2,
            hasNext: false,
            hasPrevious: true,
        });
    });
});
