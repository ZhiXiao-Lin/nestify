import { createHash } from 'node:crypto';
import { RedissonService } from '@a3s-lab/redisson';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { from, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { readRecord } from './utils';

export interface DistributedLockOptions {
    key: string;
    waitTime?: number;
    leaseTime?: number;
    watchdog?: boolean;
    prefix?: string;
}

export interface LockOptions {
    waitTime?: number;
    leaseTime?: number;
    watchdog?: boolean;
}

export type LockResult<T> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: Error };

const MAX_LOCK_KEY_LENGTH = 1_024;
const MAX_LOCK_TEMPLATE_VALUE_LENGTH = 4_096;
const MAX_LOCK_WAIT_MS = 2_147_483_647;
const LOCK_TEMPLATE = /\{\{(body|params|query)\.(\w+)\}\}/gu;

export class DistributedLockAcquisitionError extends Error {
    override readonly name = 'DistributedLockAcquisitionError';

    constructor(
        readonly lockKey: string,
        options?: ErrorOptions,
    ) {
        super(`Failed to acquire distributed lock: ${lockKey}`, options);
    }
}

export class DistributedLockReleaseError extends Error {
    override readonly name = 'DistributedLockReleaseError';

    constructor(
        readonly lockKey: string,
        options?: ErrorOptions,
    ) {
        super(`Failed to release distributed lock: ${lockKey}`, options);
    }
}

export class DistributedLockCleanupError extends AggregateError {
    override readonly name = 'DistributedLockCleanupError';

    constructor(
        readonly operationError: Error,
        readonly releaseError: DistributedLockReleaseError,
    ) {
        super([operationError, releaseError], 'Distributed lock operation and release both failed');
    }
}

@Injectable()
export class DistributedLockService {
    private readonly logger = new Logger(DistributedLockService.name);

    constructor(private readonly redisson: RedissonService) {}

    async withLock<T>(key: string, callback: () => Promise<T> | T, options: LockOptions = {}): Promise<LockResult<T>> {
        if (typeof callback !== 'function') throw new TypeError('distributed lock callback must be a function');
        const normalized = normalizeLockOptions(options);
        const lockKey = `lock:${validateLockKey(key)}`;
        let lock: LockLike;

        try {
            lock = this.redisson.getLock(lockKey) as LockLike;
            const acquired = await lock.tryLock(normalized.waitTime, normalized.watchdog ? true : normalized.leaseTime);
            if (!acquired) return { success: false, error: new DistributedLockAcquisitionError(lockKey) };
        } catch (error) {
            this.logger.error('Distributed lock acquisition failed');
            return {
                success: false,
                error: new DistributedLockAcquisitionError(lockKey, { cause: normalizeError(error) }),
            };
        }

        let value: T | undefined;
        let operationError: Error | undefined;
        try {
            value = await callback();
        } catch (error) {
            operationError = normalizeError(error);
        }

        let releaseError: DistributedLockReleaseError | undefined;
        try {
            await lock.unlock();
        } catch (error) {
            this.logger.error('Distributed lock release failed');
            releaseError = new DistributedLockReleaseError(lockKey, { cause: normalizeError(error) });
        }

        if (operationError && releaseError) {
            return { success: false, error: new DistributedLockCleanupError(operationError, releaseError) };
        }
        if (operationError) return { success: false, error: operationError };
        if (releaseError) return { success: false, error: releaseError };
        return { success: true, value: value as T };
    }
}

interface LockLike {
    tryLock(waitTime: number, leaseTime: number | true): Promise<boolean>;
    unlock(): Promise<void>;
}

export const DISTRIBUTED_LOCK_KEY = 'resilience:distributed_lock';
export const DistributedLock = (options: DistributedLockOptions) => SetMetadata(DISTRIBUTED_LOCK_KEY, options);

@Injectable()
export class DistributedLockInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly lockService: DistributedLockService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const lockOptions = this.reflector.getAllAndOverride<DistributedLockOptions | undefined>(DISTRIBUTED_LOCK_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!lockOptions) return next.handle();

        const request = context.switchToHttp().getRequest<Request>();
        const lockKey = this.resolveLockKey(lockOptions, request);

        return from(
            this.lockService.withLock(lockKey, () => lastValueFrom(next.handle()), {
                waitTime: lockOptions.waitTime,
                leaseTime: lockOptions.leaseTime,
                watchdog: lockOptions.watchdog,
            }),
        ).pipe(
            mergeMap(result => {
                if (!result.success) {
                    return throwError(() => result.error ?? new Error(`Failed to acquire lock: ${lockKey}`));
                }
                return of(result.value);
            }),
        );
    }

    private resolveLockKey(options: DistributedLockOptions, request: Request): string {
        if (!options || typeof options !== 'object') throw new TypeError('distributed lock options must be an object');
        if (typeof options.key !== 'string' || !options.key.trim()) {
            throw new TypeError('distributed lock template key must not be empty');
        }
        const source = options.key.trim();
        if (source.length > MAX_LOCK_KEY_LENGTH) {
            throw new RangeError(`distributed lock template cannot exceed ${MAX_LOCK_KEY_LENGTH} characters`);
        }
        const records = {
            body: readRecord(request.body),
            params: readRecord(request.params),
            query: readRecord(request.query),
        };
        const base = source.replace(LOCK_TEMPLATE, (_match, sourceName: keyof typeof records, field: string) => {
            return hashTemplateValue(readTemplateValue(records[sourceName], sourceName, field));
        });
        if (base.includes('{{') || base.includes('}}')) {
            throw new TypeError('distributed lock key contains an unsupported template expression');
        }
        const prefix = options.prefix === undefined ? undefined : validateLockPrefix(options.prefix);
        return validateLockKey(prefix ? `${prefix}:${base}` : base);
    }
}

function normalizeLockOptions(options: LockOptions): Required<LockOptions> {
    if (!options || typeof options !== 'object') throw new TypeError('lock options must be an object');
    const waitTime = options.waitTime ?? 5_000;
    if (!Number.isSafeInteger(waitTime) || waitTime < 0 || waitTime > MAX_LOCK_WAIT_MS) {
        throw new RangeError(`lock waitTime must be a safe integer between 0 and ${MAX_LOCK_WAIT_MS}`);
    }
    const leaseTime = options.leaseTime ?? 30_000;
    if (!Number.isSafeInteger(leaseTime) || leaseTime < 1 || leaseTime > MAX_LOCK_WAIT_MS) {
        throw new RangeError(`lock leaseTime must be a positive safe integer no greater than ${MAX_LOCK_WAIT_MS}`);
    }
    const watchdog = options.watchdog ?? false;
    if (typeof watchdog !== 'boolean') throw new TypeError('lock watchdog must be a boolean');
    return Object.freeze({ waitTime, leaseTime, watchdog });
}

function validateLockKey(key: string): string {
    if (typeof key !== 'string' || !key.trim()) throw new TypeError('distributed lock key must not be empty');
    const normalized = key.trim();
    if (normalized.length > MAX_LOCK_KEY_LENGTH) {
        throw new RangeError(`distributed lock key cannot exceed ${MAX_LOCK_KEY_LENGTH} characters`);
    }
    if (/[\u0000-\u001f\u007f{}]/u.test(normalized)) {
        throw new TypeError('distributed lock key cannot contain control characters or braces');
    }
    return normalized;
}

function validateLockPrefix(prefix: string): string {
    if (typeof prefix !== 'string' || !prefix.trim()) throw new TypeError('distributed lock prefix must not be empty');
    const normalized = prefix.trim();
    if (normalized.length > 128) throw new RangeError('distributed lock prefix cannot exceed 128 characters');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/u.test(normalized)) {
        throw new TypeError('distributed lock prefix contains unsupported characters');
    }
    return normalized;
}

function readTemplateValue(record: Record<string, unknown>, source: string, field: string): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(record, field);
    if (!descriptor || !('value' in descriptor) || descriptor.value === undefined || descriptor.value === null) {
        throw new TypeError(`distributed lock template ${source}.${field} is missing`);
    }
    return descriptor.value;
}

function hashTemplateValue(value: unknown): string {
    const type = typeof value;
    if (type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'bigint') {
        throw new TypeError('distributed lock template values must be primitive');
    }
    if (type === 'number' && !Number.isFinite(value)) {
        throw new TypeError('distributed lock template numbers must be finite');
    }
    const serialized = String(value);
    if (!serialized.trim()) throw new TypeError('distributed lock template values must not be empty');
    if (serialized.length > MAX_LOCK_TEMPLATE_VALUE_LENGTH) {
        throw new RangeError(
            `distributed lock template value cannot exceed ${MAX_LOCK_TEMPLATE_VALUE_LENGTH} characters`,
        );
    }
    return createHash('sha256').update(`${type}:${serialized}`).digest('hex');
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}
