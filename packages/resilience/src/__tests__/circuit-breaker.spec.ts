import {
    CircuitBreakerInstance,
    CircuitBreakerOpenError,
    CircuitBreakerService,
    CircuitBreakerServiceClosedError,
    CircuitState,
} from '../circuit-breaker';

describe('CircuitBreakerService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses consecutive failures and ignores stale successes after another call opens the circuit', async () => {
        const service = new CircuitBreakerService();
        const options = { failureThreshold: 2, resetTimeout: 1_000 };

        await expect(
            service.execute('payments', async () => Promise.reject(new Error('one')), options),
        ).rejects.toThrow('one');
        await expect(service.execute('payments', async () => 'recovered')).resolves.toBe('recovered');
        await expect(service.execute('payments', async () => Promise.reject(new Error('two')))).rejects.toThrow('two');
        expect(service.getAllStats()[0]).toMatchObject({ state: CircuitState.CLOSED, failures: 1 });

        const staleSuccess = deferred<string>();
        const succeeding = service.execute('shipping', () => staleSuccess.promise, {
            failureThreshold: 1,
            resetTimeout: 1_000,
        });
        await expect(service.execute('shipping', async () => Promise.reject(new Error('opens')))).rejects.toThrow(
            'opens',
        );
        staleSuccess.resolve('late');
        await expect(succeeding).resolves.toBe('late');
        expect(service.getCircuitBreaker('shipping').getStats()).toMatchObject({
            state: CircuitState.OPEN,
            failures: 1,
            successes: 0,
        });
    });

    it('admits only the configured number of concurrent half-open probes', async () => {
        let now = 1_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const service = new CircuitBreakerService();
        await expect(
            service.execute('provider', async () => Promise.reject(new Error('down')), {
                failureThreshold: 1,
                successThreshold: 2,
                resetTimeout: 100,
                halfOpenMaxAttempts: 1,
            }),
        ).rejects.toThrow('down');

        now = 1_100;
        const probe = deferred<string>();
        const probing = service.execute('provider', () => probe.promise);
        await expect(service.execute('provider', async () => 'second')).rejects.toBeInstanceOf(CircuitBreakerOpenError);
        expect(service.getAllStats()[0]).toMatchObject({ state: CircuitState.HALF_OPEN, halfOpenInFlight: 1 });

        probe.resolve('first');
        await expect(probing).resolves.toBe('first');
        expect(service.getAllStats()[0]).toMatchObject({ state: CircuitState.HALF_OPEN, successes: 1 });
        await expect(service.execute('provider', async () => 'healthy')).resolves.toBe('healthy');
        expect(service.getAllStats()[0]).toMatchObject({ state: CircuitState.CLOSED, failures: 0, successes: 0 });
    });

    it('reopens immediately when a half-open probe fails', async () => {
        let now = 100;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const service = new CircuitBreakerService();
        const options = { failureThreshold: 1, resetTimeout: 10 };
        await expect(
            service.execute('search', async () => Promise.reject(new Error('down')), options),
        ).rejects.toThrow();

        now = 110;
        await expect(service.execute('search', async () => Promise.reject(new Error('still down')))).rejects.toThrow(
            'still down',
        );
        expect(service.getAllStats()[0]).toMatchObject({ state: CircuitState.OPEN, failures: 1 });
        expect(service.getAllStats()[0]?.nextAttempt).toEqual(new Date(120));
    });

    it('returns defensive date copies from stats and errors', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(1_000);
        const service = new CircuitBreakerService();
        await expect(
            service.execute('billing', async () => Promise.reject(new Error('down')), {
                failureThreshold: 1,
                resetTimeout: 500,
            }),
        ).rejects.toThrow();

        const stats = service.getAllStats()[0];
        stats?.nextAttempt?.setTime(0);
        stats?.lastFailure?.setTime(0);
        expect(service.getAllStats()[0]?.nextAttempt).toEqual(new Date(1_500));
        expect(service.getAllStats()[0]?.lastFailure).toEqual(new Date(1_000));

        let error: unknown;
        try {
            await service.execute('billing', async () => 'no');
        } catch (caught) {
            error = caught;
        }
        expect(error).toMatchObject({ circuitName: 'billing', nextAttempt: new Date(1_500) });
    });

    it('resets named and all circuits and closes permanently on destroy', async () => {
        const service = new CircuitBreakerService();
        for (const name of ['one', 'two']) {
            await expect(
                service.execute(name, async () => Promise.reject(new Error('down')), { failureThreshold: 1 }),
            ).rejects.toThrow();
        }
        service.reset(' one ');
        expect(service.getCircuitBreaker('one').getStats().state).toBe(CircuitState.CLOSED);
        service.resetAll();
        expect(service.getAllStats().every(stats => stats.state === CircuitState.CLOSED)).toBe(true);

        service.onModuleDestroy();
        expect(service.getAllStats()).toEqual([]);
        expect(() => service.getCircuitBreaker('new')).toThrow(CircuitBreakerServiceClosedError);
        await expect(service.execute('new', async () => 'value')).rejects.toBeInstanceOf(
            CircuitBreakerServiceClosedError,
        );
    });

    it('normalizes names and supports a separate display name', () => {
        const service = new CircuitBreakerService();
        const circuit = service.getCircuitBreaker('  upstream  ', { name: ' Public API ' });

        expect(circuit.name).toBe('Public API');
        expect(circuit.getStats().name).toBe('Public API');
        expect(service.getCircuitBreaker('upstream')).toBe(circuit);
        expect(new CircuitBreakerInstance('direct').getStats().name).toBe('direct');
    });

    it('ignores late failure accounting while already open', () => {
        const circuit = new CircuitBreakerInstance('direct', { failureThreshold: 1 });
        circuit.recordFailure();
        circuit.recordFailure();
        expect(circuit.getStats()).toMatchObject({ state: CircuitState.OPEN, failures: 1 });
    });

    it.each([
        ['', {}, 'name'],
        ['x'.repeat(257), {}, 'cannot exceed'],
        ['bad\nname', {}, 'control'],
        ['valid', { failureThreshold: 0 }, 'failureThreshold'],
        ['valid', { successThreshold: 0 }, 'successThreshold'],
        ['valid', { resetTimeout: -1 }, 'resetTimeout'],
        ['valid', { halfOpenMaxAttempts: 0 }, 'halfOpenMaxAttempts'],
        ['valid', null, 'options'],
    ] as Array<
        [string, Record<string, unknown> | null, string]
    >)('validates circuit input %#', (name, options, message) => {
        expect(() => new CircuitBreakerInstance(name, options as never)).toThrow(message);
    });

    it('rejects a missing operation', async () => {
        await expect(new CircuitBreakerService().execute('test', undefined as never)).rejects.toThrow(
            'operation must be a function',
        );
    });
});

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(resolvePromise => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}
