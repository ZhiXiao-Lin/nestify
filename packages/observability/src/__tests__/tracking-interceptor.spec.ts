import type { LogEvent } from 'kysely';
import { lastValueFrom, Observable, of } from 'rxjs';
import {
    getCorrelationId,
    getRecordedExternalCallsOrEmpty,
    getRecordedSqlsOrEmpty,
    getRequestId,
    getTrackingContext,
    recordExternalCall,
    recordSql,
    TrackingInterceptor,
} from '../index';

describe('tracking interceptor integration', () => {
    it('creates tracking context and collector stores for a request', async () => {
        const interceptor = new TrackingInterceptor();
        const headers = new Map<string, string>();
        const request = {
            headers: { 'x-request-id': 'req-track', 'x-correlation-id': 'corr-track' },
            principal: { actorId: 42, id: 'actor-1', subjectId: 'subject-1' },
        };
        const response = {
            headersSent: false,
            setHeader: (name: string, value: string) => headers.set(name, value),
        };

        const result = await lastValueFrom(
            interceptor.intercept(createContext({ request, response }), {
                handle: () =>
                    new Observable(subscriber => {
                        recordSql({
                            level: 'query',
                            query: { sql: 'select * from resources where id = $1', parameters: ['resource-1'] },
                            queryDurationMillis: 3,
                        } as unknown as LogEvent);
                        recordExternalCall({
                            kind: 'http',
                            target: 'external-service',
                            op: 'POST /events',
                            durationMs: 12,
                        });

                        subscriber.next({
                            requestId: getRequestId(),
                            correlationId: getCorrelationId(),
                            context: getTrackingContext(),
                            sqls: getRecordedSqlsOrEmpty(),
                            calls: getRecordedExternalCallsOrEmpty(),
                        });
                        subscriber.complete();
                    }),
            }),
        );

        expect(result).toMatchObject({
            requestId: 'req-track',
            correlationId: 'corr-track',
            context: { actorId: 'actor-1', subjectId: 'subject-1' },
            sqls: [expect.objectContaining({ sql: 'select * from resources where id = $?' })],
            calls: [expect.objectContaining({ kind: 'http', target: 'external-service' })],
        });
        expect(headers.get('x-request-id')).toBe('req-track');
        expect(headers.get('x-correlation-id')).toBe('corr-track');
    });

    it('bypasses non-HTTP transports without touching HTTP adapters', async () => {
        const interceptor = new TrackingInterceptor();
        const context = {
            getType: () => 'rpc',
            switchToHttp: () => {
                throw new Error('must not switch to HTTP');
            },
        } as never;
        await expect(lastValueFrom(interceptor.intercept(context, { handle: () => of('rpc') }))).resolves.toBe('rpc');
        expect(getTrackingContext()).toBeUndefined();
    });

    it('reads only bounded own identity fields and returns defensive context snapshots', async () => {
        const interceptor = new TrackingInterceptor();
        const inherited = { actorId: 'inherited' };
        const principal = Object.create(inherited) as Record<string, unknown>;
        const getter = jest.fn(() => 'getter');
        Object.defineProperty(principal, 'id', { get: getter, enumerable: true });
        principal.sub = [`  actor\n${'x'.repeat(300)}  `];
        const request = { headers: { 'x-request-id': 'req-own' }, principal };
        const response = { headersSent: false, setHeader: jest.fn() };

        const result = await lastValueFrom(
            interceptor.intercept(createContext({ request, response }), {
                handle: () =>
                    new Observable(subscriber => {
                        const snapshot = getTrackingContext();
                        if (snapshot) snapshot.actorId = 'mutated';
                        subscriber.next({ snapshot, current: getTrackingContext() });
                        subscriber.complete();
                    }),
            }),
        );

        expect((result as { snapshot: { actorId: string } }).snapshot.actorId).toBe('mutated');
        expect((result as { current: { actorId: string } }).current.actorId).toMatch(/^actor x+$/);
        expect((result as { current: { actorId: string } }).current.actorId).toHaveLength(256);
        expect(getter).not.toHaveBeenCalled();
    });

    it('propagates observable teardown through collector scopes', () => {
        const interceptor = new TrackingInterceptor();
        const teardown = jest.fn();
        const request = { headers: { 'x-request-id': 'req-teardown' } };
        const response = { headersSent: false, setHeader: jest.fn() };
        const subscription = interceptor
            .intercept(createContext({ request, response }), {
                handle: () => new Observable(() => teardown),
            })
            .subscribe();
        subscription.unsubscribe();
        expect(teardown).toHaveBeenCalledTimes(1);
    });

    it('replaces unsafe or oversized inbound request identifiers before tracking and response propagation', async () => {
        const interceptor = new TrackingInterceptor();
        const headers = new Map<string, string>();
        const request = {
            headers: {
                'x-request-id': 'unsafe\nrequest',
                'x-correlation-id': 'x'.repeat(129),
            },
        };
        const response = {
            headersSent: false,
            setHeader: (name: string, value: string) => headers.set(name, value),
        };
        const result = await lastValueFrom(
            interceptor.intercept(createContext({ request, response }), {
                handle: () => of({ requestId: getRequestId(), correlationId: getCorrelationId() }),
            }),
        );

        expect(result).toMatchObject({
            requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        });
        expect((result as { requestId: string; correlationId: string }).correlationId).toBe(
            (result as { requestId: string; correlationId: string }).requestId,
        );
        expect(headers.get('x-request-id')).toBe((result as { requestId: string }).requestId);
        expect(headers.get('x-correlation-id')).toBe((result as { correlationId: string }).correlationId);
    });
});

function createContext(options: { request: Record<string, unknown>; response: Record<string, unknown> }) {
    return {
        switchToHttp: () => ({
            getRequest: () => options.request,
            getResponse: () => options.response,
        }),
    } as never;
}
