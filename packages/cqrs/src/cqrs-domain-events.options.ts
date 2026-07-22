import { CqrsDomainEventConfigurationError } from './cqrs-domain-events.errors';
import type {
    DomainEventBatchMode,
    NestCqrsDomainEventPublisherOptions,
    ResolvedNestCqrsDomainEventPublisherOptions,
} from './cqrs-domain-events.types';

export const NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS = Symbol.for('@a3s-lab/cqrs/domain-event-publisher-options');
export const DEFAULT_DOMAIN_EVENT_BATCH_MODE: DomainEventBatchMode = 'ordered';
export const DEFAULT_DOMAIN_EVENT_MAX_CONCURRENCY = 8;
export const DEFAULT_DOMAIN_EVENT_MAX_BATCH_SIZE = 1000;

const BATCH_MODES = new Set<DomainEventBatchMode>(['ordered', 'parallel', 'native']);

export function normalizeNestCqrsDomainEventPublisherOptions(
    options: NestCqrsDomainEventPublisherOptions | undefined = {},
): ResolvedNestCqrsDomainEventPublisherOptions {
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
        throw new CqrsDomainEventConfigurationError('CQRS domain-event publisher options must be an object');
    }

    const mode = options.mode ?? DEFAULT_DOMAIN_EVENT_BATCH_MODE;
    if (!BATCH_MODES.has(mode)) {
        throw new CqrsDomainEventConfigurationError('mode must be ordered, parallel, or native');
    }

    return Object.freeze({
        mode,
        maxConcurrency: positiveInteger(
            'maxConcurrency',
            options.maxConcurrency ?? DEFAULT_DOMAIN_EVENT_MAX_CONCURRENCY,
        ),
        maxBatchSize: positiveInteger('maxBatchSize', options.maxBatchSize ?? DEFAULT_DOMAIN_EVENT_MAX_BATCH_SIZE),
    });
}

function positiveInteger(name: string, value: unknown): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new CqrsDomainEventConfigurationError(`${name} must be a positive safe integer`);
    }
    return value as number;
}
