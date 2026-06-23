import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedissonService } from '@a3s-lab/redisson';
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

export interface LockResult<T> {
    success: boolean;
    value?: T;
    error?: Error;
}

@Injectable()
export class DistributedLockService {
    private readonly logger = new Logger(DistributedLockService.name);

    constructor(private readonly redisson: RedissonService) {}

    async withLock<T>(key: string, callback: () => Promise<T> | T, options: LockOptions = {}): Promise<LockResult<T>> {
        const waitTime = options.waitTime ?? 5000;
        const leaseTime = options.leaseTime ?? 30000;
        const lockKey = `lock:${key}`;
        const lock = this.redisson.getLock(lockKey) as LockLike;
        let acquired = false;

        try {
            acquired = await lock.tryLock(waitTime, options.watchdog ? true : leaseTime);
            if (!acquired) {
                return { success: false, error: new Error(`Failed to acquire lock: ${lockKey}`) };
            }
            return { success: true, value: await callback() };
        } catch (error) {
            this.logger.error(`Error during locked operation: ${lockKey}`, error);
            return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
        } finally {
            if (acquired) {
                try {
                    if (await lock.isLocked()) await lock.unlock();
                } catch (error) {
                    this.logger.error(`Error releasing lock: ${lockKey}`, error);
                }
            }
        }
    }
}

interface LockLike {
    tryLock(waitTime: number, leaseTime: number | true): Promise<boolean>;
    isLocked(): Promise<boolean>;
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
        const base = options.key
            .replace(/\{\{body\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.body)[field] ?? ''))
            .replace(/\{\{params\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.params)[field] ?? ''))
            .replace(/\{\{query\.(\w+)\}\}/g, (_, field: string) => String(readRecord(request.query)[field] ?? ''));
        return options.prefix ? `${options.prefix}:${base}` : base;
    }
}
