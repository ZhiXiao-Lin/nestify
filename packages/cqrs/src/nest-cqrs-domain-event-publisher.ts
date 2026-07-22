import { DOMAIN_EVENT_PUBLISHER, type DomainEvent, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { Inject, Injectable, Optional, type Provider } from '@nestjs/common';
import { EventBus as NestEventBus } from '@nestjs/cqrs';
import {
    CqrsDomainEventConfigurationError,
    DomainEventBatchPublicationError,
    type DomainEventPublicationFailure,
} from './cqrs-domain-events.errors';
import {
    NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
    normalizeNestCqrsDomainEventPublisherOptions,
} from './cqrs-domain-events.options';
import type {
    NestCqrsDomainEventPublisherOptions,
    ResolvedNestCqrsDomainEventPublisherOptions,
} from './cqrs-domain-events.types';

@Injectable()
export class NestCqrsDomainEventPublisher implements IDomainEventPublisher {
    private readonly options: ResolvedNestCqrsDomainEventPublisherOptions;

    constructor(
        private readonly eventBus: NestEventBus,
        @Optional()
        @Inject(NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS)
        options?: NestCqrsDomainEventPublisherOptions,
    ) {
        if (!isObject(eventBus) || typeof eventBus.publish !== 'function') {
            throw new CqrsDomainEventConfigurationError('Nest CQRS EventBus must provide publish()');
        }
        this.options = normalizeNestCqrsDomainEventPublisherOptions(options);
    }

    /** Publish one structurally valid domain event and await custom async publishers. */
    async publish(event: DomainEvent): Promise<void> {
        this.assertDomainEvent(event, 'event');
        await this.publishValidated(event);
    }

    /**
     * Publish a bounded snapshot using the configured batch strategy. Ordered
     * mode is deterministic and stops admitting events after the first error.
     */
    async publishAll(events: DomainEvent[]): Promise<void> {
        const batch = this.normalizeBatch(events);
        if (batch.length === 0) {
            return;
        }

        switch (this.options.mode) {
            case 'ordered':
                await this.publishOrdered(batch);
                return;
            case 'parallel':
                await this.publishParallel(batch);
                return;
            case 'native':
                await this.publishNative(batch);
                return;
        }
    }

    private async publishOrdered(events: readonly DomainEvent[]): Promise<void> {
        for (const event of events) {
            await this.publishValidated(event);
        }
    }

    private async publishParallel(events: readonly DomainEvent[]): Promise<void> {
        const failures: Array<DomainEventPublicationFailure | undefined> = new Array(events.length);
        let nextIndex = 0;
        const worker = async () => {
            while (true) {
                const index = nextIndex;
                nextIndex += 1;
                if (index >= events.length) {
                    return;
                }
                try {
                    await this.publishValidated(events[index]);
                } catch (error) {
                    failures[index] = { index, event: events[index], error };
                }
            }
        };

        const workerCount = Math.min(this.options.maxConcurrency, events.length);
        await Promise.all(Array.from({ length: workerCount }, worker));
        this.throwFailures(
            failures.filter((failure): failure is DomainEventPublicationFailure => failure !== undefined),
        );
    }

    private async publishNative(events: readonly DomainEvent[]): Promise<void> {
        const publishAll = this.eventBus.publishAll;
        if (typeof publishAll !== 'function') {
            throw new CqrsDomainEventConfigurationError('native mode requires Nest CQRS EventBus.publishAll()');
        }

        const result = this.eventBus.publishAll([...events]) as unknown;
        if (!Array.isArray(result)) {
            await result;
            return;
        }
        if (result.length > events.length) {
            throw new CqrsDomainEventConfigurationError(
                'Nest CQRS EventBus.publishAll returned more results than submitted events',
            );
        }

        const settled = await Promise.allSettled(result.map(value => Promise.resolve(value)));
        const failures: DomainEventPublicationFailure[] = [];
        for (let index = 0; index < settled.length; index += 1) {
            const outcome = settled[index];
            if (outcome.status === 'rejected') {
                failures.push({ index, event: events[index], error: outcome.reason });
            }
        }
        this.throwFailures(failures);
    }

    private async publishValidated(event: DomainEvent): Promise<void> {
        await this.eventBus.publish(event);
    }

    private normalizeBatch(events: DomainEvent[]): readonly DomainEvent[] {
        if (!Array.isArray(events)) {
            throw new CqrsDomainEventConfigurationError('events must be an array');
        }
        if (events.length > this.options.maxBatchSize) {
            throw new CqrsDomainEventConfigurationError(
                `events exceeds the configured maxBatchSize of ${this.options.maxBatchSize}`,
            );
        }

        const snapshot = [...events];
        for (let index = 0; index < snapshot.length; index += 1) {
            this.assertDomainEvent(snapshot[index], `events[${index}]`);
        }
        return snapshot;
    }

    private assertDomainEvent(event: unknown, label: string): asserts event is DomainEvent {
        if (
            !isObject(event) ||
            !(event.occurredOn instanceof Date) ||
            Number.isNaN(event.occurredOn.getTime()) ||
            typeof event.getAggregateId !== 'function'
        ) {
            throw new CqrsDomainEventConfigurationError(
                `${label} must provide a valid occurredOn Date and getAggregateId()`,
            );
        }
    }

    private throwFailures(failures: readonly DomainEventPublicationFailure[]): void {
        if (failures.length === 1) {
            throw failures[0].error;
        }
        if (failures.length > 1) {
            throw new DomainEventBatchPublicationError(failures);
        }
    }
}

/** Backward-compatible, unconfigured provider for the DDD publisher token. */
export function createNestCqrsDomainEventPublisherProvider(): Provider {
    return {
        provide: DOMAIN_EVENT_PUBLISHER,
        useClass: NestCqrsDomainEventPublisher,
    };
}

/** Providers for direct configurable module composition. */
export function createNestCqrsDomainEventPublisherProviders(options?: NestCqrsDomainEventPublisherOptions): Provider[] {
    return [
        {
            provide: NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
            useValue: normalizeNestCqrsDomainEventPublisherOptions(options),
        },
        NestCqrsDomainEventPublisher,
        {
            provide: DOMAIN_EVENT_PUBLISHER,
            useExisting: NestCqrsDomainEventPublisher,
        },
    ];
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
