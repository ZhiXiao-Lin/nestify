import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, lastValueFrom, Observable } from 'rxjs';
import { sleep } from './utils';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    /** Random delay added as a ratio of the capped backoff. Defaults to 0.25. */
    jitterRatio?: number;
    retryableErrors?: ReadonlyArray<new (...args: never[]) => Error>;
    isRetryable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
    /** Stops scheduling attempts. The operation itself must observe the same signal for mid-attempt cancellation. */
    signal?: AbortSignal;
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

export const DEFAULT_RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];

const DEFAULT_RETRY_OPTIONS = Object.freeze({
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 30_000,
    backoffMultiplier: 2,
    jitterRatio: 0.25,
});

const MAX_TIMER_DELAY = 2_147_483_647;

interface NormalizedRetryOptions {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterRatio: number;
    retryableErrors: ReadonlyArray<new (...args: never[]) => Error>;
    isRetryable?: (error: Error) => boolean;
    onRetry?: RetryOptions['onRetry'];
    signal?: AbortSignal;
}

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    async execute<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<RetryResult<T>> {
        if (typeof fn !== 'function') throw new TypeError('retry operation must be a function');
        const opts = normalizeRetryOptions(options);
        const startTime = Date.now();
        let lastError: Error | undefined;
        let attempt = 0;

        if (opts.signal?.aborted) {
            return failureResult(new RetryAbortedError(opts.signal.reason), attempt, startTime);
        }

        while (attempt < opts.maxAttempts) {
            attempt += 1;
            try {
                const result = await fn();
                if (opts.signal?.aborted) {
                    return failureResult(new RetryAbortedError(opts.signal.reason), attempt, startTime);
                }
                return { success: true, result, attempts: attempt, totalDuration: elapsedSince(startTime) };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (opts.signal?.aborted) {
                    lastError = new RetryAbortedError(opts.signal.reason);
                    break;
                }
                if (attempt >= opts.maxAttempts || !this.isRetryable(lastError, opts)) {
                    break;
                }
                const delay = this.calculateDelay(attempt, opts);
                opts.onRetry?.(attempt, lastError, delay);
                this.logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms: ${lastError.message}`);
                try {
                    await sleep(delay, opts.signal);
                } catch {
                    lastError = new RetryAbortedError(opts.signal?.reason);
                    break;
                }
            }
        }

        return failureResult(lastError, attempt, startTime);
    }

    async executeOrThrow<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
        const result = await this.execute(fn, options);
        if (!result.success) {
            if (result.error instanceof RetryAbortedError) throw result.error;
            throw new RetryExhaustedError(result.attempts, result.totalDuration, result.error);
        }
        return result.result as T;
    }

    private isRetryable(
        error: Error,
        options: Pick<NormalizedRetryOptions, 'retryableErrors' | 'isRetryable'>,
    ): boolean {
        const hasClassFilter = options.retryableErrors.length > 0;
        const hasPredicate = options.isRetryable !== undefined;
        if (!hasClassFilter && !hasPredicate) return true;
        return (
            options.retryableErrors.some(ErrorClass => error instanceof ErrorClass) ||
            (options.isRetryable?.(error) ?? false)
        );
    }

    private calculateDelay(
        attempt: number,
        options: Pick<NormalizedRetryOptions, 'initialDelay' | 'backoffMultiplier' | 'maxDelay' | 'jitterRatio'>,
    ): number {
        const exponential = options.initialDelay * options.backoffMultiplier ** (attempt - 1);
        const baseDelay = Math.min(Number.isFinite(exponential) ? exponential : options.maxDelay, options.maxDelay);
        const jitter = Math.round(Math.random() * baseDelay * options.jitterRatio);
        return Math.min(baseDelay + jitter, options.maxDelay);
    }
}

export class RetryAbortedError extends Error {
    override readonly name = 'RetryAbortedError';

    constructor(readonly reason?: unknown) {
        super('Retry operation was aborted', { cause: reason });
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
            { cause: lastError },
        );
        this.name = 'RetryExhaustedError';
    }
}

function normalizeRetryOptions(options: RetryOptions): NormalizedRetryOptions {
    if (!options || typeof options !== 'object') throw new TypeError('retry options must be an object');
    const maxAttempts = positiveSafeInteger('maxAttempts', options.maxAttempts ?? DEFAULT_RETRY_OPTIONS.maxAttempts);
    const initialDelay = timerDelay('initialDelay', options.initialDelay ?? DEFAULT_RETRY_OPTIONS.initialDelay);
    const maxDelay = timerDelay('maxDelay', options.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay);
    const backoffMultiplier = options.backoffMultiplier ?? DEFAULT_RETRY_OPTIONS.backoffMultiplier;
    if (!Number.isFinite(backoffMultiplier) || backoffMultiplier < 1) {
        throw new RangeError('backoffMultiplier must be a finite number greater than or equal to 1');
    }
    const jitterRatio = options.jitterRatio ?? DEFAULT_RETRY_OPTIONS.jitterRatio;
    if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
        throw new RangeError('jitterRatio must be a finite number between 0 and 1');
    }
    const retryableErrors = options.retryableErrors ?? [];
    if (!Array.isArray(retryableErrors) || retryableErrors.some(ErrorClass => typeof ErrorClass !== 'function')) {
        throw new TypeError('retryableErrors must contain error constructors');
    }
    if (options.isRetryable !== undefined && typeof options.isRetryable !== 'function') {
        throw new TypeError('isRetryable must be a function');
    }
    if (options.onRetry !== undefined && typeof options.onRetry !== 'function') {
        throw new TypeError('onRetry must be a function');
    }
    if (options.signal !== undefined && !isAbortSignal(options.signal)) {
        throw new TypeError('signal must be an AbortSignal');
    }
    return Object.freeze({
        maxAttempts,
        initialDelay,
        maxDelay,
        backoffMultiplier,
        jitterRatio,
        retryableErrors: Object.freeze([...retryableErrors]),
        isRetryable: options.isRetryable,
        onRetry: options.onRetry,
        signal: options.signal,
    });
}

function positiveSafeInteger(name: string, value: number): number {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new RangeError(`${name} must be a positive safe integer`);
    }
    return value;
}

function timerDelay(name: string, value: number): number {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIMER_DELAY) {
        throw new RangeError(`${name} must be a safe integer between 0 and ${MAX_TIMER_DELAY}`);
    }
    return value;
}

function isAbortSignal(value: unknown): value is AbortSignal {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as AbortSignal).aborted === 'boolean' &&
        typeof (value as AbortSignal).addEventListener === 'function' &&
        typeof (value as AbortSignal).removeEventListener === 'function'
    );
}

function failureResult(error: Error | undefined, attempts: number, startTime: number): RetryResult<never> {
    return { success: false, error, attempts, totalDuration: elapsedSince(startTime) };
}

function elapsedSince(startTime: number): number {
    return Math.max(0, Date.now() - startTime);
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
