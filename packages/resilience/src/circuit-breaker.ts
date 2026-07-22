import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    OnModuleDestroy,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
    failureThreshold?: number;
    successThreshold?: number;
    resetTimeout?: number;
    /** Concurrent probes admitted while half-open. Defaults to one. */
    halfOpenMaxAttempts?: number;
    name?: string;
}

export interface CircuitBreakerStats {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure?: Date;
    lastSuccess?: Date;
    nextAttempt?: Date;
    halfOpenInFlight: number;
}

const DEFAULT_CIRCUIT_OPTIONS = Object.freeze({
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30_000,
    halfOpenMaxAttempts: 1,
});

const MAX_CIRCUIT_NAME_LENGTH = 256;

interface NormalizedCircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    resetTimeout: number;
    halfOpenMaxAttempts: number;
    name: string;
}

export class CircuitBreakerServiceClosedError extends Error {
    override readonly name = 'CircuitBreakerServiceClosedError';

    constructor() {
        super('CircuitBreakerService has been destroyed');
    }
}

@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
    private readonly circuits = new Map<string, CircuitBreakerInstance>();
    private destroyed = false;

    getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreakerInstance {
        if (this.destroyed) throw new CircuitBreakerServiceClosedError();
        const circuitName = normalizeCircuitName(name);
        const existing = this.circuits.get(circuitName);
        if (existing) return existing;
        const circuit = new CircuitBreakerInstance(circuitName, options);
        this.circuits.set(circuitName, circuit);
        return circuit;
    }

    async execute<T>(name: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T> {
        if (typeof fn !== 'function') throw new TypeError('circuit breaker operation must be a function');
        const circuit = this.getCircuitBreaker(name, options);
        if (!circuit.canExecute()) {
            throw new CircuitBreakerOpenError(circuit.name, circuit.getNextAttempt());
        }
        try {
            const result = await fn();
            circuit.recordSuccess();
            return result;
        } catch (error) {
            circuit.recordFailure();
            throw error;
        }
    }

    getAllStats(): CircuitBreakerStats[] {
        return [...this.circuits.values()].map(circuit => circuit.getStats());
    }

    reset(name: string): void {
        this.circuits.get(normalizeCircuitName(name))?.reset();
    }

    resetAll(): void {
        for (const circuit of this.circuits.values()) circuit.reset();
    }

    onModuleDestroy(): void {
        this.destroyed = true;
        this.circuits.clear();
    }
}

export class CircuitBreakerInstance {
    private state = CircuitState.CLOSED;
    private failures = 0;
    private successes = 0;
    private lastFailure?: Date;
    private lastSuccess?: Date;
    private nextAttempt?: Date;
    private halfOpenInFlight = 0;
    private readonly options: NormalizedCircuitBreakerOptions;

    constructor(
        private readonly circuitName: string,
        options: CircuitBreakerOptions = {},
    ) {
        this.circuitName = normalizeCircuitName(circuitName);
        this.options = normalizeCircuitOptions(this.circuitName, options);
    }

    get name(): string {
        return this.options.name;
    }

    canExecute(): boolean {
        if (this.state === CircuitState.CLOSED) return true;
        if (this.state === CircuitState.OPEN && this.nextAttempt && Date.now() >= this.nextAttempt.getTime()) {
            this.state = CircuitState.HALF_OPEN;
            this.successes = 0;
            this.failures = 0;
            this.halfOpenInFlight = 0;
        }
        if (this.state !== CircuitState.HALF_OPEN || this.halfOpenInFlight >= this.options.halfOpenMaxAttempts) {
            return false;
        }
        this.halfOpenInFlight += 1;
        return true;
    }

    recordSuccess(): void {
        this.lastSuccess = new Date(Date.now());
        if (this.state === CircuitState.OPEN) return;
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
            this.successes = safeIncrement(this.successes);
            if (this.successes >= this.options.successThreshold) this.reset();
            return;
        }
        this.failures = 0;
        this.successes = safeIncrement(this.successes);
    }

    recordFailure(): void {
        this.lastFailure = new Date(Date.now());
        if (this.state === CircuitState.OPEN) return;
        this.failures = safeIncrement(this.failures);
        this.successes = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenInFlight = Math.max(0, this.halfOpenInFlight - 1);
            this.open();
            return;
        }
        if (this.failures >= this.options.failureThreshold) this.open();
    }

    getStats(): CircuitBreakerStats {
        return {
            name: this.options.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: cloneDate(this.lastFailure),
            lastSuccess: cloneDate(this.lastSuccess),
            nextAttempt: cloneDate(this.nextAttempt),
            halfOpenInFlight: this.halfOpenInFlight,
        };
    }

    getNextAttempt(): Date | undefined {
        return cloneDate(this.nextAttempt);
    }

    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = undefined;
        this.lastSuccess = undefined;
        this.nextAttempt = undefined;
        this.halfOpenInFlight = 0;
    }

    private open(): void {
        this.state = CircuitState.OPEN;
        this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
        this.successes = 0;
        this.halfOpenInFlight = 0;
    }
}

export class CircuitBreakerOpenError extends Error {
    override readonly name = 'CircuitBreakerOpenError';

    constructor(
        public readonly circuitName: string,
        public readonly nextAttempt?: Date,
    ) {
        super(`Circuit breaker '${circuitName}' is open. Next attempt: ${nextAttempt?.toISOString() ?? 'unknown'}`);
    }
}

export const CIRCUIT_BREAKER_OPTIONS = 'resilience:circuit_breaker_options';
export const CircuitBreaker = (options: CircuitBreakerOptions) => SetMetadata(CIRCUIT_BREAKER_OPTIONS, options);

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly circuitBreakers: CircuitBreakerService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const options = this.reflector.getAllAndOverride<CircuitBreakerOptions | undefined>(CIRCUIT_BREAKER_OPTIONS, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!options) return next.handle();
        const name = options.name || `${context.getClass().name}.${context.getHandler().name}`;
        return from(this.circuitBreakers.execute(name, () => lastValueFrom(next.handle()), options));
    }
}

function normalizeCircuitOptions(circuitName: string, options: CircuitBreakerOptions): NormalizedCircuitBreakerOptions {
    if (!options || typeof options !== 'object') throw new TypeError('circuit breaker options must be an object');
    const failureThreshold = positiveSafeInteger(
        'failureThreshold',
        options.failureThreshold ?? DEFAULT_CIRCUIT_OPTIONS.failureThreshold,
    );
    const successThreshold = positiveSafeInteger(
        'successThreshold',
        options.successThreshold ?? DEFAULT_CIRCUIT_OPTIONS.successThreshold,
    );
    const resetTimeout = nonNegativeSafeInteger(
        'resetTimeout',
        options.resetTimeout ?? DEFAULT_CIRCUIT_OPTIONS.resetTimeout,
    );
    const halfOpenMaxAttempts = positiveSafeInteger(
        'halfOpenMaxAttempts',
        options.halfOpenMaxAttempts ?? DEFAULT_CIRCUIT_OPTIONS.halfOpenMaxAttempts,
    );
    return Object.freeze({
        failureThreshold,
        successThreshold,
        resetTimeout,
        halfOpenMaxAttempts,
        name: options.name === undefined ? circuitName : normalizeCircuitName(options.name),
    });
}

function normalizeCircuitName(name: string): string {
    if (typeof name !== 'string' || !name.trim()) throw new TypeError('circuit breaker name must not be empty');
    const normalized = name.trim();
    if (normalized.length > MAX_CIRCUIT_NAME_LENGTH) {
        throw new RangeError(`circuit breaker name cannot exceed ${MAX_CIRCUIT_NAME_LENGTH} characters`);
    }
    if (/[\u0000-\u001f\u007f]/u.test(normalized)) {
        throw new TypeError('circuit breaker name cannot contain control characters');
    }
    return normalized;
}

function positiveSafeInteger(name: string, value: number): number {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${name} must be a positive safe integer`);
    return value;
}

function nonNegativeSafeInteger(name: string, value: number): number {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative safe integer`);
    }
    return value;
}

function safeIncrement(value: number): number {
    return Math.min(Number.MAX_SAFE_INTEGER, value + 1);
}

function cloneDate(value: Date | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value.getTime());
}
