import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';
import { sleep } from './utils';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: Array<new (...args: unknown[]) => Error>;
    isRetryable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

export const DEFAULT_RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];

const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [] as Array<new (...args: unknown[]) => Error>,
    isRetryable: () => true,
};

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    async execute<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<RetryResult<T>> {
        const opts = {
            ...DEFAULT_RETRY_OPTIONS,
            ...options,
            retryableErrors: options.retryableErrors ?? DEFAULT_RETRY_OPTIONS.retryableErrors,
            isRetryable: options.isRetryable ?? DEFAULT_RETRY_OPTIONS.isRetryable,
        };
        const startTime = Date.now();
        let lastError: Error | undefined;
        let attempt = 0;

        while (attempt < opts.maxAttempts) {
            attempt += 1;
            try {
                const result = await fn();
                return { success: true, result, attempts: attempt, totalDuration: Date.now() - startTime };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt >= opts.maxAttempts || !this.isRetryable(lastError, opts)) {
                    break;
                }
                const delay = this.calculateDelay(attempt, opts) + this.calculateJitter(opts.initialDelay);
                options.onRetry?.(attempt, lastError, delay);
                this.logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms: ${lastError.message}`);
                await sleep(delay);
            }
        }

        return { success: false, error: lastError, attempts: attempt, totalDuration: Date.now() - startTime };
    }

    async executeOrThrow<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
        const result = await this.execute(fn, options);
        if (!result.success) {
            throw new RetryExhaustedError(result.attempts, result.totalDuration, result.error);
        }
        return result.result as T;
    }

    private isRetryable(
        error: Error,
        options: { retryableErrors: Array<new (...args: unknown[]) => Error>; isRetryable: (error: Error) => boolean },
    ): boolean {
        return options.retryableErrors.some(ErrorClass => error instanceof ErrorClass) || options.isRetryable(error);
    }

    private calculateDelay(
        attempt: number,
        options: { initialDelay: number; backoffMultiplier: number; maxDelay: number },
    ): number {
        return Math.min(options.initialDelay * options.backoffMultiplier ** (attempt - 1), options.maxDelay);
    }

    private calculateJitter(delay: number): number {
        return Math.round(Math.random() * delay * 0.25);
    }
}

export class RetryExhaustedError extends Error {
    constructor(
        public readonly attempts: number,
        public readonly totalDuration: number,
        public readonly lastError?: Error,
    ) {
        super(
            `Retry exhausted after ${attempts} attempts (${totalDuration}ms): ${lastError?.message ?? 'Unknown error'}`,
        );
        this.name = 'RetryExhaustedError';
    }
}

export const RETRY_OPTIONS = 'resilience:retry_options';

export interface RetryDecoratorOptions extends RetryOptions {
    name?: string;
}

export const Retry = (options: RetryDecoratorOptions = {}) => SetMetadata(RETRY_OPTIONS, options);

@Injectable()
export class RetryInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly retry: RetryService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const options = this.reflector.getAllAndOverride<RetryDecoratorOptions | undefined>(RETRY_OPTIONS, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!options) return next.handle();
        return from(this.retry.executeOrThrow(() => lastValueFrom(next.handle()), options));
    }
}
