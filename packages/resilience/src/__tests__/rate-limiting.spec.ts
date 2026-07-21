import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import {
    createRateLimitStorageKey,
    DEFAULT_RATE_LIMITS,
    RateLimit,
    RateLimitApi,
    RateLimitAuth,
    RateLimitByName,
    RateLimitExceededException,
    RateLimitingGuard,
    RateLimitingOptions,
    RateLimitingService,
    RateLimitUpload,
} from '../index';

describe('rate limiting', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses one atomic Redis script and returns an accurate sliding-window result', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const evaluate = jest.fn().mockResolvedValue([2, 9_000, 1]);
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
        expect(evaluate.mock.calls[0][0]).toContain('if count < limit then');
        expect(evaluate.mock.calls[0][1]).toBe(1);
        expect(evaluate.mock.calls[0][2]).toMatch(/^ratelimit:auth:[a-f0-9]{64}$/);
        expect(evaluate.mock.calls[0][2]).not.toContain('subject-1');
        expect(evaluate.mock.calls[0][7]).toBe('3');
    });

    it('denies without adding another Redis member after the bounded window reaches its limit', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const evaluate = jest.fn().mockResolvedValue([3, 8_000, 0]);
        const service = createService(evaluate);

        await expect(service.checkLimit('subject', { limit: 3, windowSeconds: 5 })).resolves.toEqual({
            allowed: false,
            remaining: 0,
            resetAt: new Date(13_000),
            retryAfter: 3,
        });
        const script = evaluate.mock.calls[0][0] as string;
        expect(script.indexOf('local count')).toBeLessThan(script.indexOf("redis.call('ZADD'"));
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
        expect(() => createService(jest.fn(), { backendFailureMode: 'other' as never })).toThrow('backendFailureMode');
        expect(() => createService(jest.fn(), { identifierExtractor: 'id' as never })).toThrow('identifierExtractor');
        await expect(createService(jest.fn()).checkLimit('a', { limit: 0, windowSeconds: 60 })).rejects.toThrow(
            RangeError,
        );
        await expect(createService(jest.fn()).checkLimit('a', { limit: 1, windowSeconds: 31_536_001 })).rejects.toThrow(
            'windowSeconds',
        );
        await expect(createService(jest.fn()).checkLimit('', { limit: 1, windowSeconds: 60 })).rejects.toThrow(
            TypeError,
        );
        await expect(
            createService(jest.fn()).checkLimit(`id-${'x'.repeat(4_096)}`, { limit: 1, windowSeconds: 60 }),
        ).rejects.toThrow('identifier cannot exceed');
    });

    it('normalizes identifiers and rejects ambiguous key namespaces', () => {
        const config = { limit: 2, windowSeconds: 60, policy: 'auth' };
        expect(createRateLimitStorageKey('  subject  ', config)).toBe(createRateLimitStorageKey('subject', config));
        expect(() => createRateLimitStorageKey('bad\nsubject', config)).toThrow('control characters');
        expect(() => createRateLimitStorageKey('subject', { ...config, policy: 'bad policy' })).toThrow(
            'unsupported characters',
        );
        expect(() => createRateLimitStorageKey('subject', { ...config, keyPrefix: 'x'.repeat(129) })).toThrow(
            'cannot exceed',
        );
    });

    it('falls back safely for malformed Redis results and resets local state on destroy', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const evaluate = jest.fn().mockResolvedValueOnce([1, 9_000, 2]).mockRejectedValue(new Error('offline'));
        const service = createService(evaluate);
        const config = { limit: 1, windowSeconds: 60 };

        await expect(service.checkLimit('subject', config)).resolves.toMatchObject({ allowed: true, remaining: 0 });
        await expect(service.checkLimit('subject', config)).resolves.toMatchObject({ allowed: false, remaining: 0 });
        await expect(service.checkLimit('subject', config)).resolves.toMatchObject({ allowed: false, remaining: 0 });
        service.onModuleDestroy();
        await expect(service.checkLimit('subject', config)).resolves.toMatchObject({ allowed: true, remaining: 0 });
    });

    it('falls back when Redis returns non-numeric counters', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const service = createService(jest.fn().mockResolvedValue(['invalid', 9_000, 1]));
        await expect(service.checkLimit('subject', { limit: 2, windowSeconds: 60 })).resolves.toMatchObject({
            allowed: true,
            remaining: 1,
        });
    });

    it('replaces an expired local entry before performing capacity eviction', async () => {
        let now = 10_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const service = createService(jest.fn().mockRejectedValue(new Error('offline')), { maxLocalEntries: 1 });
        const config = { limit: 1, windowSeconds: 1 };
        await service.checkLimit('subject', config);
        now = 11_000;
        await expect(service.checkLimit('subject', config)).resolves.toMatchObject({ allowed: true });
    });

    it('creates immutable built-in policies and decorator metadata', () => {
        expect(Object.isFrozen(DEFAULT_RATE_LIMITS)).toBe(true);
        expect(Object.isFrozen(DEFAULT_RATE_LIMITS.auth)).toBe(true);
        expect(RateLimit()).toEqual(expect.any(Function));
        expect(RateLimitByName('default')).toEqual(expect.any(Function));
        expect(RateLimitAuth()).toEqual(expect.any(Function));
        expect(RateLimitApi()).toEqual(expect.any(Function));
        expect(RateLimitUpload()).toEqual(expect.any(Function));
        expect(() => RateLimit({ limit: 0, windowSeconds: 1 })).toThrow('rate limit');
        expect(() => RateLimitByName('missing' as never)).toThrow('Unknown rate limit policy');
    });

    it('falls back for inconsistent or out-of-range Redis timestamps', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const inconsistent = createService(jest.fn().mockResolvedValue([2, 9_000, 1]));
        await expect(inconsistent.checkLimit('subject', { limit: 1, windowSeconds: 60 })).resolves.toMatchObject({
            allowed: true,
            remaining: 0,
        });

        const outOfRange = createService(jest.fn().mockResolvedValue([1, Number.MAX_SAFE_INTEGER, 1]));
        await expect(outOfRange.checkLimit('subject', { limit: 1, windowSeconds: 60 })).resolves.toMatchObject({
            allowed: true,
            remaining: 0,
        });
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
                'RateLimit-Limit': 10,
                'RateLimit-Remaining': 9,
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

    it('passes through undecorated requests and validates extracted identities', async () => {
        const checkLimit = jest.fn();
        const noMetadata = new RateLimitingGuard(
            { checkLimit } as unknown as RateLimitingService,
            { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector,
        );
        const request = createGuardContext({ headers: {}, socket: { remoteAddress: '127.0.0.1' } });
        await expect(noMetadata.canActivate(request.context)).resolves.toBe(true);
        expect(checkLimit).not.toHaveBeenCalled();

        const nonString = createGuard(jest.fn(), { identifierExtractor: async () => 42 as never });
        await expect(nonString.canActivate(request.context)).rejects.toThrow('must return a string');
        const empty = createGuard(jest.fn(), { identifierExtractor: async () => ' ' });
        await expect(empty.canActivate(request.context)).rejects.toThrow('must not be empty');

        const missing = createGuard(jest.fn());
        await expect(missing.canActivate(createGuardContext({ headers: {}, socket: {} }).context)).rejects.toThrow(
            'verified identifier',
        );
    });

    it('uses a socket address when Express request.ip is unavailable', async () => {
        const checkLimit = jest.fn().mockResolvedValue({
            allowed: true,
            remaining: 1,
            resetAt: new Date(Date.now() + 1_000),
        });
        const { context } = createGuardContext({ headers: {}, socket: { remoteAddress: ' 127.0.0.2 ' } });

        await createGuard(checkLimit).canActivate(context);
        expect(checkLimit).toHaveBeenCalledWith('ip:127.0.0.2', DEFAULT_RATE_LIMITS.auth);
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
