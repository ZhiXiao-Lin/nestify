import type { DomainEvent } from '@a3s-lab/ddd';

/** Invalid publisher/module configuration or invalid runtime input. */
export class CqrsDomainEventConfigurationError extends TypeError {
    override readonly name = 'CqrsDomainEventConfigurationError';
}

export interface DomainEventPublicationFailure {
    readonly index: number;
    readonly event: DomainEvent;
    readonly error: unknown;
}

/** Every failure from a parallel/native batch, in original event order. */
export class DomainEventBatchPublicationError extends AggregateError {
    override readonly name = 'DomainEventBatchPublicationError';
    readonly failures: readonly DomainEventPublicationFailure[];

    constructor(failures: readonly DomainEventPublicationFailure[]) {
        super(
            failures.map(failure => failure.error),
            `Failed to publish ${failures.length} domain events`,
        );
        this.failures = Object.freeze([...failures]);
    }
}
