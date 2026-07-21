import {
    CircuitBreakerOpenError,
    CircuitBreakerService,
    CircuitState,
    RetryExhaustedError,
    RetryService,
    TtlCache,
} from '../index';

describe('resilience utilities', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('retries retryable operations and returns attempt metadata', async () => {
        const retry = new RetryService();
        let attempts = 0;

        const result = await retry.execute(
            async () => {
                attempts += 1;
                if (attempts < 2) {
                    throw new Error('temporary');
                }
                return 'ok';
            },
            { maxAttempts: 3, initialDelay: 0, maxDelay: 0 },
        );

        expect(result).toMatchObject({ success: true, result: 'ok', attempts: 2 });
    });

    it('throws RetryExhaustedError from executeOrThrow after max attempts', async () => {
        const retry = new RetryService();

        await expect(
            retry.executeOrThrow(
                async () => {
                    throw new Error('still down');
                },
                { maxAttempts: 2, initialDelay: 0, maxDelay: 0 },
            ),
        ).rejects.toMatchObject({
            name: 'RetryExhaustedError',
            attempts: 2,
            lastError: expect.objectContaining({ message: 'still down' }),
        } satisfies Partial<RetryExhaustedError>);
    });

    it('opens a circuit after the configured failure threshold', async () => {
        const service = new CircuitBreakerService();

        await expect(
            service.execute(
                'payments',
                async () => {
                    throw new Error('provider down');
                },
                { failureThreshold: 1, resetTimeout: 1000 },
            ),
        ).rejects.toThrow('provider down');

        expect(service.getAllStats()[0]).toMatchObject({ name: 'payments', state: CircuitState.OPEN, failures: 1 });
        await expect(service.execute('payments', async () => 'ok')).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    });

    it('expires TTL cache entries and deduplicates concurrent loads', async () => {
        let now = 1000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);

        const cache = new TtlCache<number>(50);
        cache.set('answer', 42);

        expect(cache.get('answer')).toBe(42);

        now += 50;

        expect(cache.get('answer')).toBeUndefined();

        let loads = 0;
        const [left, right] = await Promise.all([
            cache.getOrLoad('next', async () => {
                loads += 1;
                return 7;
            }),
            cache.getOrLoad('next', async () => {
                loads += 1;
                return 8;
            }),
        ]);

        expect([left, right]).toEqual([7, 7]);
        expect(loads).toBe(1);
    });
});
