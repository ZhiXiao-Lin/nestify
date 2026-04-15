// ============================================================================
// Retry Service - Automatic retry with exponential backoff
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
    /** Maximum number of attempts */
    maxAttempts?: number;
    /** Initial delay in ms */
    initialDelay?: number;
    /** Maximum delay in ms */
    maxDelay?: number;
    /** Backoff multiplier */
    backoffMultiplier?: number;
    /** List of errors that should trigger retry */
    retryableErrors?: Array<new (...args: any[]) => Error>;
    /** Function to determine if error is retryable */
    isRetryable?: (error: Error) => boolean;
    /** Callback on retry */
    onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors' | 'isRetryable'>> & { retryableErrors: any[]; isRetryable: (error: Error) => boolean } = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [],
    isRetryable: () => true,
};

/**
 * Common retryable HTTP errors
 */
export const DEFAULT_RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Retry Service - provides automatic retry with exponential backoff
 */
@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    constructor() {}

    /**
     * Execute a function with retry logic
     */
    async execute<T>(
        fn: () => Promise<T>,
        options?: RetryOptions,
    ): Promise<RetryResult<T>> {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
            retryableErrors: options?.retryableErrors ?? DEFAULT_OPTIONS.retryableErrors,
            isRetryable: options?.isRetryable ?? DEFAULT_OPTIONS.isRetryable,
        };
        const startTime = Date.now();
        let lastError: Error | undefined;
        let attempt = 0;

        while (attempt < opts.maxAttempts) {
            attempt++;

            try {
                const result = await fn();
                return {
                    success: true,
                    result,
                    attempts: attempt,
                    totalDuration: Date.now() - startTime,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if we should retry
                if (attempt >= opts.maxAttempts) {
                    break;
                }

                if (!this.isRetryable(lastError, opts)) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = this.calculateDelay(attempt, opts);
                const jitter = this.calculateJitter(delay);

                if (opts.onRetry) {
                    opts.onRetry(attempt, lastError, delay + jitter);
                }

                this.logger.warn(
                    `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay + jitter}ms due to: ${lastError.message}`,
                );

                // Wait before next attempt
                await this.sleep(delay + jitter);
            }
        }

        return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDuration: Date.now() - startTime,
        };
    }

    /**
     * Execute with retry - throws on failure
     */
    async executeOrThrow<T>(
        fn: () => Promise<T>,
        options?: RetryOptions,
    ): Promise<T> {
        const result = await this.execute(fn, options);

        if (!result.success) {
            throw new RetryExhaustedError(
                result.attempts,
                result.totalDuration,
                result.error,
            );
        }

        return result.result!;
    }

    /**
     * Check if error is retryable
     */
    private isRetryable(error: Error, options: { retryableErrors: any[]; isRetryable: (error: Error) => boolean }): boolean {
        // Check custom retryable errors
        if (options.retryableErrors.length > 0) {
            for (const ErrorClass of options.retryableErrors) {
                if (error instanceof ErrorClass) {
                    return true;
                }
            }
        }

        // Check custom function
        return options.isRetryable(error);
    }

    /**
     * Calculate delay with exponential backoff
     */
    private calculateDelay(attempt: number, options: { initialDelay: number; backoffMultiplier: number; maxDelay: number }): number {
        const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
        return Math.min(delay, options.maxDelay);
    }

    /**
     * Add jitter to prevent thundering herd
     */
    private calculateJitter(delay: number): number {
        // 0-25% of delay
        return Math.random() * delay * 0.25;
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Error thrown when all retries are exhausted
 */
export class RetryExhaustedError extends Error {
    constructor(
        public readonly attempts: number,
        public readonly totalDuration: number,
        public readonly lastError?: Error,
    ) {
        super(`Retry exhausted after ${attempts} attempts (${totalDuration}ms): ${lastError?.message ?? 'Unknown error'}`);
        this.name = 'RetryExhaustedError';
    }
}

/**
 * Decorator options
 */
export interface RetryDecoratorOptions extends RetryOptions {
    /** Name for logging */
    name?: string;
}

/**
 * Decorator to automatically retry a method
 */
export function Retry(options: RetryDecoratorOptions = {}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const retryService = new RetryService();

        descriptor.value = async function (...args: any[]) {
            return retryService.executeOrThrow(
                () => originalMethod.apply(this, args),
                options,
            );
        };

        return descriptor;
    };
}
