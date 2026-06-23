import type { LogEvent } from 'kysely';
import { Observable, lastValueFrom } from 'rxjs';
import {
    TrackingInterceptor,
    getCorrelationId,
    getRecordedExternalCallsOrEmpty,
    getRecordedSqlsOrEmpty,
    getRequestId,
    getTrackingContext,
    recordExternalCall,
    recordSql,
} from '../index';

describe('tracking interceptor integration', () => {
    it('creates tracking context and collector stores for a request', async () => {
        const interceptor = new TrackingInterceptor();
        const headers = new Map<string, string>();
        const request = {
            headers: { 'x-request-id': 'req-track', 'x-correlation-id': 'corr-track' },
            principal: { actorId: 'actor-1', subjectId: 'subject-1' },
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
            sqls: [expect.objectContaining({ sql: 'select * from resources where id = $1' })],
            calls: [expect.objectContaining({ kind: 'http', target: 'external-service' })],
        });
        expect(headers.get('x-request-id')).toBe('req-track');
        expect(headers.get('x-correlation-id')).toBe('corr-track');
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
