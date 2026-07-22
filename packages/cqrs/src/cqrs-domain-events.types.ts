import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';

export type DomainEventBatchMode = 'ordered' | 'parallel' | 'native';

export interface NestCqrsDomainEventPublisherOptions {
    /** Batch strategy. Ordered is deterministic and fail-fast. Defaults to ordered. */
    mode?: DomainEventBatchMode;
    /** Maximum simultaneously pending publishes in parallel mode. Defaults to 8. */
    maxConcurrency?: number;
    /** Reject larger batches before any event is published. Defaults to 1000. */
    maxBatchSize?: number;
}

export interface NestCqrsDomainEventsModuleOptions extends NestCqrsDomainEventPublisherOptions {
    /** Make the dynamic module global. Defaults to false. */
    isGlobal?: boolean;
}

export interface NestCqrsDomainEventsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /** Make the dynamic module global. Defaults to false. */
    isGlobal?: boolean;
    inject?: FactoryProvider['inject'];
    useFactory: (...args: any[]) => NestCqrsDomainEventPublisherOptions | Promise<NestCqrsDomainEventPublisherOptions>;
}

export interface ResolvedNestCqrsDomainEventPublisherOptions {
    readonly mode: DomainEventBatchMode;
    readonly maxConcurrency: number;
    readonly maxBatchSize: number;
}
