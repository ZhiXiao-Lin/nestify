// ============================================================================
// Circuit Breaker - Protect external calls from cascading failures
// ============================================================================

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export enum CircuitState {
    CLOSED = 'CLOSED',       // Normal operation
    OPEN = 'OPEN',           // Failing, reject calls
    HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
    /** Failure threshold to open circuit */
    failureThreshold?: number;
    /** Success threshold to close circuit (from half-open) */
    successThreshold?: number;
    /** Time in ms before attempting recovery */
    resetTimeout?: number;
    /** Name for this circuit breaker */
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

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 30000, // 30 seconds
    name: 'default',
};

/**
 * Circuit Breaker states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests are rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests pass through
 */
@Injectable()
export class CircuitBreakerService implements OnModuleDestroy {
    private readonly logger = new Logger(CircuitBreakerService.name);
    private readonly circuits: Map<string, CircuitBreaker> = new Map();

    constructor() {}

    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
        if (this.circuits.has(name)) {
            return this.circuits.get(name)!;
        }

        const circuit = new CircuitBreaker(name, {
            ...DEFAULT_OPTIONS,
            ...options,
        });
        this.circuits.set(name, circuit);
        return circuit;
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(
        name: string,
        fn: () => Promise<T>,
        options?: CircuitBreakerOptions,
    ): Promise<T> {
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

    /**
     * Get all circuit breaker stats
     */
    getAllStats(): CircuitBreakerStats[] {
        return Array.from(this.circuits.values()).map(c => c.getStats());
    }

    /**
     * Get stats for a specific circuit
     */
    getStats(name: string): CircuitBreakerStats | undefined {
        return this.circuits.get(name)?.getStats();
    }

    /**
     * Reset a specific circuit
     */
    reset(name: string): void {
        this.circuits.get(name)?.reset();
    }

    /**
     * Reset all circuits
     */
    resetAll(): void {
        for (const circuit of this.circuits.values()) {
            circuit.reset();
        }
    }

    onModuleDestroy(): void {
        this.logger.log('Circuit breaker service destroyed');
    }
}

/**
 * Individual circuit breaker instance
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures = 0;
    private successes = 0;
    private lastFailure?: Date;
    private lastSuccess?: Date;
    private nextAttempt?: Date;
    private readonly name: string;
    private readonly options: Required<CircuitBreakerOptions>;

    constructor(name: string, options: Required<CircuitBreakerOptions>) {
        this.name = options.name ?? name;
        this.options = options;
    }

    /**
     * Check if a request can be executed
     */
    canExecute(): boolean {
        switch (this.state) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.OPEN:
                // Check if reset timeout has passed
                if (this.nextAttempt && new Date() >= this.nextAttempt) {
                    this.transitionToHalfOpen();
                    return true;
                }
                return false;

            case CircuitState.HALF_OPEN:
                // In half-open, allow limited requests through
                return true;
        }
    }

    /**
     * Record a successful call
     */
    recordSuccess(): void {
        this.lastSuccess = new Date();
        this.successes++;

        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successes >= this.options.successThreshold) {
                this.transitionToClosed();
            }
        }
    }

    /**
     * Record a failed call
     */
    recordFailure(): void {
        this.lastFailure = new Date();
        this.failures++;

        if (this.state === CircuitState.CLOSED) {
            if (this.failures >= this.options.failureThreshold) {
                this.transitionToOpen();
            }
        } else if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in half-open immediately opens the circuit
            this.transitionToOpen();
        }
    }

    /**
     * Get current stats
     */
    getStats(): CircuitBreakerStats {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            nextAttempt: this.nextAttempt,
        };
    }

    /**
     * Get next attempt time
     */
    getNextAttempt(): Date | undefined {
        return this.nextAttempt;
    }

    /**
     * Reset the circuit breaker
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = undefined;
        this.lastSuccess = undefined;
        this.nextAttempt = undefined;
    }

    /**
     * Transition to OPEN state
     */
    private transitionToOpen(): void {
        this.state = CircuitState.OPEN;
        this.nextAttempt = new Date(Date.now() + this.options.resetTimeout);
        this.successes = 0; // Reset success count
    }

    /**
     * Transition to HALF_OPEN state
     */
    private transitionToHalfOpen(): void {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
    }

    /**
     * Transition to CLOSED state
     */
    private transitionToClosed(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = undefined;
    }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
    constructor(
        public readonly circuitName: string,
        public readonly nextAttempt?: Date,
    ) {
        super(`Circuit breaker '${circuitName}' is open. Next attempt: ${nextAttempt?.toISOString() ?? 'unknown'}`);
        this.name = 'CircuitBreakerOpenError';
    }
}
