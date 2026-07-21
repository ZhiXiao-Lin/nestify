import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import {
    createRateLimitStorageKey,
    DEFAULT_RATE_LIMITS,
    RateLimitExceededException,
    RateLimitingGuard,
    RateLimitingOptions,
    RateLimitingService,
} from '../index';

describe('rate limiting', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses one atomic Redis script and returns an accurate sliding-window result', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const evaluate = jest.fn().mockResolvedValue([2, 9_000]);
        const service = createService(evaluate);

        const result = await service.checkLimit('user:subject-1', {
            limit: 3,
            windowSeconds: 5,
            policy: 'auth',
        });

        expect(result).toEqual({
            allowed: true,
            remaining: 1,
            resetAt: new Date(14_000),
            retryAfter: undefined,
        });
        expect(evaluate).toHaveBeenCalledTimes(1);
        expect(evaluate.mock.calls[0][0]).toContain("redis.call('ZREMRANGEBYSCORE'");
        expect(evaluate.mock.calls[0][1]).toBe(1);
        expect(evaluate.mock.calls[0][2]).toMatch(/^ratelimit:auth:[a-f0-9]{64}$/);
        expect(evaluate.mock.calls[0][2]).not.toContain('subject-1');
    });

    it('isolates built-in policies even when their numeric limits match', () => {
        const defaultKey = createRateLimitStorageKey('ip:127.0.0.1', DEFAULT_RATE_LIMITS.default);
        const uploadKey = createRateLimitStorageKey('ip:127.0.0.1', DEFAULT_RATE_LIMITS.upload);

        expect(defaultKey).not.toBe(uploadKey);
        expect(defaultKey).toContain(':default:');
        expect(uploadKey).toContain(':upload:');
    });

    it('bounds the local fallback and evicts its oldest entry', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const service = createService(jest.fn().mockRejectedValue(new Error('redis unavailable')), {
            maxLocalEntries: 2,
        });
        const config = { limit: 1, windowSeconds: 60, policy: 'test' };

        await expect(service.checkLimit('a', config)).resolves.toMatchObject({ allowed: true });
        await expect(service.checkLimit('a', config)).resolves.toMatchObject({ allowed: false });
        await service.checkLimit('b', config);
        await service.checkLimit('c', config);

        await expect(service.checkLimit('a', config)).resolves.toMatchObject({ allowed: true });
    });

    it('supports explicit fail-open and fail-closed backend policies', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const failure = jest.fn().mockRejectedValue(new Error('redis unavailable'));
        const config = { limit: 2, windowSeconds: 30 };

        await expect(createService(failure, { backendFailureMode: 'allow' }).checkLimit('a', config)).resolves.toEqual({
            allowed: true,
            remaining: 2,
            resetAt: new Date(40_000),
        });
        await expect(createService(failure, { backendFailureMode: 'deny' }).checkLimit('a', config)).resolves.toEqual({
            allowed: false,
            remaining: 0,
            resetAt: new Date(40_000),
            retryAfter: 30,
        });
    });

    it('validates limiter configuration and local capacity', async () => {
        expect(() => createService(jest.fn(), { maxLocalEntries: 0 })).toThrow(RangeError);
        await expect(createService(jest.fn()).checkLimit('a', { limit: 0, windowSeconds: 60 })).rejects.toThrow(
            RangeError,
        );
        await expect(createService(jest.fn()).checkLimit('', { limit: 1, windowSeconds: 60 })).rejects.toThrow(
            TypeError,
        );
    });

    it('uses Express request.ip and never reads x-forwarded-for directly', async () => {
        const checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining: 9,
            resetAt: new Date(60_000),
        });
        const { context, response } = createGuardContext({
            headers: { 'x-forwarded-for': '198.51.100.100' },
            ip: '203.0.113.10',
            socket: { remoteAddress: '127.0.0.1' },
        });
        const guard = createGuard(checkLimit);

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(checkLimit).toHaveBeenCalledWith('ip:203.0.113.10', DEFAULT_RATE_LIMITS.auth);
        expect(response.set).toHaveBeenCalledWith(
            expect.objectContaining({
                'X-RateLimit-Limit': 10,
                'X-RateLimit-Remaining': 9,
            }),
        );
    });

    it('prefers authenticated subjects and supports a verified custom extractor', async () => {
        const authenticatedCheck = jest.fn().mockResolvedValue({
            allowed: true,
            remaining: 1,
            resetAt: new Date(60_000),
        });
        const authenticated = createGuardContext({
            headers: {},
            ip: '203.0.113.10',
            socket: {},
            user: { sub: 'subject-7' },
        });
        await createGuard(authenticatedCheck).canActivate(authenticated.context);
        expect(authenticatedCheck).toHaveBeenCalledWith('user:subject-7', DEFAULT_RATE_LIMITS.auth);

        const customCheck = jest.fn().mockResolvedValue({
            allowed: true,
            remaining: 1,
            resetAt: new Date(60_000),
        });
        const custom = createGuardContext({ headers: {}, ip: '203.0.113.10', socket: {} });
        await createGuard(customCheck, { identifierExtractor: request => `tenant:${request.ip}` }).canActivate(
            custom.context,
        );
        expect(customCheck).toHaveBeenCalledWith('custom:tenant:203.0.113.10', DEFAULT_RATE_LIMITS.auth);
    });

    it('sets retry headers and throws the package exception when denied', async () => {
        const checkLimit = jest.fn().mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: new Date(60_000),
            retryAfter: 12,
        });
        const { context, response } = createGuardContext({ headers: {}, ip: '127.0.0.1', socket: {} });

        await expect(createGuard(checkLimit).canActivate(context)).rejects.toBeInstanceOf(RateLimitExceededException);
        expect(response.set).toHaveBeenCalledWith({ 'Retry-After': 12 });
    });
});

function createService(evaluate: jest.Mock, options: RateLimitingOptions = {}) {
    return new RateLimitingService({ redis: { eval: evaluate } } as never, options);
}

function createGuard(checkLimit: jest.Mock, options: RateLimitingOptions = {}) {
    return new RateLimitingGuard(
        { checkLimit } as unknown as RateLimitingService,
        { getAllAndOverride: jest.fn().mockReturnValue(DEFAULT_RATE_LIMITS.auth) } as unknown as Reflector,
        options,
    );
}

function createGuardContext(request: Record<string, unknown>) {
    const response = { set: jest.fn() };
    const context = {
        getHandler: () => function handler() {},
        getClass: () => class Controller {},
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => response,
        }),
    } as unknown as ExecutionContext;
    return { context, response };
}
