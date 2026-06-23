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
}

const DEFAULT_CIRCUIT_OPTIONS: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000,
    name: 'default',
};

@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
    private readonly circuits = new Map<string, CircuitBreakerInstance>();

    getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreakerInstance {
        const existing = this.circuits.get(name);
        if (existing) return existing;
        const circuit = new CircuitBreakerInstance(name, { ...DEFAULT_CIRCUIT_OPTIONS, ...options });
        this.circuits.set(name, circuit);
        return circuit;
    }

    async execute<T>(name: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T> {
        const circuit = this.getCircuitBreaker(name, options);
        if (!circuit.canExecute()) {
            throw new CircuitBreakerOpenError(name, circuit.getNextAttempt());
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
        this.circuits.get(name)?.reset();
    }

    resetAll(): void {
        for (const circuit of this.circuits.values()) circuit.reset();
    }

    onModuleDestroy(): void {
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

    constructor(
        private readonly circuitName: string,
        private readonly options: Required<CircuitBreakerOptions>,
    ) {}

    canExecute(): boolean {
        if (this.state === CircuitState.CLOSED) return true;
        if (this.state === CircuitState.HALF_OPEN) return true;
        if (this.nextAttempt && new Date() >= this.nextAttempt) {
            this.state = CircuitState.HALF_OPEN;
            this.successes = 0;
            return true;
        }
        return false;
    }

    recordSuccess(): void {
        this.lastSuccess = new Date();
        this.successes += 1;
        if (this.state === CircuitState.HALF_OPEN && this.successes >= this.options.successThreshold) {
            this.reset();
        }
    }

    recordFailure(): void {
        this.lastFailure = new Date();
        this.failures += 1;
        if (this.state === CircuitState.HALF_OPEN || this.failures >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
            this.successes = 0;
        }
    }

    getStats(): CircuitBreakerStats {
        return {
            name: this.options.name || this.circuitName,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            nextAttempt: this.nextAttempt,
        };
    }

    getNextAttempt(): Date | undefined {
        return this.nextAttempt;
    }

    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = undefined;
        this.lastSuccess = undefined;
        this.nextAttempt = undefined;
    }
}

export class CircuitBreakerOpenError extends Error {
    constructor(
        public readonly circuitName: string,
        public readonly nextAttempt?: Date,
    ) {
        super(`Circuit breaker '${circuitName}' is open. Next attempt: ${nextAttempt?.toISOString() ?? 'unknown'}`);
        this.name = 'CircuitBreakerOpenError';
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
