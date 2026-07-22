import { DOMAIN_EVENT_PUBLISHER, DomainEvent } from '@a3s-lab/ddd';
import {
    CqrsDomainEventConfigurationError,
    createNestCqrsDomainEventPublisherProvider,
    createNestCqrsDomainEventPublisherProviders,
    DomainEventBatchPublicationError,
    NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
    NestCqrsDomainEventPublisher,
} from '../index';

class TestDomainEvent extends DomainEvent {
    constructor(private readonly aggregateId: string) {
        super();
    }

    getAggregateId(): string {
        return this.aggregateId;
    }
}

function deferred<T = void>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (predicate()) {
            return;
        }
        await Promise.resolve();
    }
    throw new Error('condition was not reached');
}

function createEventBus() {
    return {
        publish: jest.fn(),
        publishAll: jest.fn(),
    };
}

describe('NestCqrsDomainEventPublisher', () => {
    it('publishes one domain event and awaits a custom asynchronous publisher', async () => {
        const eventBus = createEventBus();
        const publication = deferred();
        eventBus.publish.mockReturnValue(publication.promise);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never);
        const event = new TestDomainEvent('resource-1');

        let settled = false;
        const result = publisher.publish(event).then(() => {
            settled = true;
        });
        await Promise.resolve();

        expect(eventBus.publish).toHaveBeenCalledWith(event);
        expect(settled).toBe(false);
        publication.resolve();
        await result;
        expect(settled).toBe(true);
    });

    it('publishes batches in order by default and snapshots the input', async () => {
        const eventBus = createEventBus();
        const firstPublication = deferred();
        eventBus.publish.mockImplementationOnce(() => firstPublication.promise).mockResolvedValue(undefined);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never);
        const events = [new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')];

        const publication = publisher.publishAll(events);
        events.push(new TestDomainEvent('late-mutation'));
        await Promise.resolve();
        expect(eventBus.publish).toHaveBeenCalledTimes(1);

        firstPublication.resolve();
        await publication;

        expect(eventBus.publish).toHaveBeenCalledTimes(2);
        expect(eventBus.publish).toHaveBeenNthCalledWith(1, events[0]);
        expect(eventBus.publish).toHaveBeenNthCalledWith(2, events[1]);
        expect(eventBus.publish).not.toHaveBeenCalledWith(events[2]);
        expect(eventBus.publishAll).not.toHaveBeenCalled();
    });

    it('stops an ordered batch after the original publication failure', async () => {
        const eventBus = createEventBus();
        const publicationError = new Error('publisher unavailable');
        eventBus.publish.mockResolvedValueOnce(undefined).mockRejectedValueOnce(publicationError);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never);
        const events = [
            new TestDomainEvent('resource-1'),
            new TestDomainEvent('resource-2'),
            new TestDomainEvent('resource-3'),
        ];

        await expect(publisher.publishAll(events)).rejects.toBe(publicationError);
        expect(eventBus.publish).toHaveBeenCalledTimes(2);
        expect(eventBus.publish).not.toHaveBeenCalledWith(events[2]);
    });

    it('bounds explicitly parallel publication and waits for every admitted event', async () => {
        const eventBus = createEventBus();
        const gates = Array.from({ length: 4 }, () => deferred());
        eventBus.publish.mockImplementation((event: TestDomainEvent) => gates[Number(event.getAggregateId())].promise);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, {
            mode: 'parallel',
            maxConcurrency: 2,
        });
        const events = Array.from({ length: 4 }, (_, index) => new TestDomainEvent(String(index)));

        const publication = publisher.publishAll(events);
        await waitUntil(() => eventBus.publish.mock.calls.length === 2);
        expect(eventBus.publish).toHaveBeenCalledTimes(2);

        gates[0].resolve();
        await waitUntil(() => eventBus.publish.mock.calls.length === 3);
        expect(eventBus.publish).toHaveBeenCalledTimes(3);

        gates[1].resolve();
        gates[2].resolve();
        await waitUntil(() => eventBus.publish.mock.calls.length === 4);
        gates[3].resolve();
        await publication;
    });

    it('preserves all failures from a parallel batch in event order', async () => {
        const eventBus = createEventBus();
        const firstError = new Error('first failed');
        const thirdError = new Error('third failed');
        eventBus.publish.mockImplementation((event: TestDomainEvent) => {
            if (event.getAggregateId() === '0') {
                return Promise.reject(firstError);
            }
            if (event.getAggregateId() === '2') {
                return Promise.reject(thirdError);
            }
            return Promise.resolve();
        });
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, {
            mode: 'parallel',
            maxConcurrency: 3,
        });
        const events = Array.from({ length: 3 }, (_, index) => new TestDomainEvent(String(index)));

        let received: unknown;
        try {
            await publisher.publishAll(events);
        } catch (error) {
            received = error;
        }

        expect(received).toBeInstanceOf(DomainEventBatchPublicationError);
        expect(received).toMatchObject({
            failures: [
                { index: 0, event: events[0], error: firstError },
                { index: 2, event: events[2], error: thirdError },
            ],
        });
        expect(eventBus.publish).toHaveBeenCalledTimes(3);
    });

    it('preserves the original error when only one parallel publication fails', async () => {
        const eventBus = createEventBus();
        const publicationError = new Error('one failed');
        eventBus.publish.mockRejectedValueOnce(publicationError).mockResolvedValue(undefined);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'parallel' });

        await expect(
            publisher.publishAll([new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')]),
        ).rejects.toBe(publicationError);
    });

    it('delegates native batches and awaits every array result', async () => {
        const eventBus = createEventBus();
        const secondPublication = deferred();
        eventBus.publishAll.mockReturnValue([Promise.resolve(), secondPublication.promise]);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'native' });
        const events = [new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')];

        let settled = false;
        const publication = publisher.publishAll(events).then(() => {
            settled = true;
        });
        await Promise.resolve();

        expect(eventBus.publishAll).toHaveBeenCalledWith(events);
        expect(eventBus.publish).not.toHaveBeenCalled();
        expect(settled).toBe(false);
        secondPublication.resolve();
        await publication;
        expect(settled).toBe(true);
    });

    it('awaits a promise returned directly by native batch publication', async () => {
        const eventBus = createEventBus();
        const nativePublication = deferred();
        eventBus.publishAll.mockReturnValue(nativePublication.promise);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'native' });

        let settled = false;
        const publication = publisher.publishAll([new TestDomainEvent('resource-1')]).then(() => {
            settled = true;
        });
        await Promise.resolve();
        expect(settled).toBe(false);

        nativePublication.resolve();
        await publication;
        expect(settled).toBe(true);
    });

    it('preserves multiple failures returned by a native batch', async () => {
        const eventBus = createEventBus();
        const firstError = new Error('first native failure');
        const secondError = new Error('second native failure');
        eventBus.publishAll.mockReturnValue([Promise.reject(firstError), Promise.reject(secondError)]);
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'native' });
        const events = [new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')];

        await expect(publisher.publishAll(events)).rejects.toMatchObject({
            failures: [
                { index: 0, event: events[0], error: firstError },
                { index: 1, event: events[1], error: secondError },
            ],
        });
    });

    it('validates the EventBus native batch contract', async () => {
        const event = new TestDomainEvent('resource-1');
        const missingNative = new NestCqrsDomainEventPublisher({ publish: jest.fn() } as never, { mode: 'native' });
        await expect(missingNative.publishAll([event])).rejects.toThrow('requires Nest CQRS EventBus.publishAll');

        const eventBus = createEventBus();
        eventBus.publishAll.mockReturnValue([undefined, undefined]);
        const oversizedResult = new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'native' });
        await expect(oversizedResult.publishAll([event])).rejects.toThrow('more results than submitted events');
    });

    it('validates events and batch limits before publishing anything', async () => {
        const eventBus = createEventBus();
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never, { maxBatchSize: 1 });

        await expect(publisher.publish({ occurredOn: new Date('invalid') } as never)).rejects.toThrow(
            CqrsDomainEventConfigurationError,
        );
        await expect(publisher.publishAll(null as never)).rejects.toThrow('events must be an array');
        await expect(
            publisher.publishAll([new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')]),
        ).rejects.toThrow('maxBatchSize');
        await expect(publisher.publishAll([{} as never])).rejects.toThrow('events[0]');
        await expect(publisher.publishAll([])).resolves.toBeUndefined();
        expect(eventBus.publish).not.toHaveBeenCalled();
        expect(eventBus.publishAll).not.toHaveBeenCalled();
    });

    it('validates EventBus and publisher options at construction', () => {
        const eventBus = createEventBus();

        expect(() => new NestCqrsDomainEventPublisher({} as never)).toThrow('must provide publish');
        expect(() => new NestCqrsDomainEventPublisher(eventBus as never, null as never)).toThrow('must be an object');
        expect(() => new NestCqrsDomainEventPublisher(eventBus as never, { mode: 'fast' as never })).toThrow('mode');
        expect(() => new NestCqrsDomainEventPublisher(eventBus as never, { maxConcurrency: 0 })).toThrow(
            'maxConcurrency',
        );
        expect(() => new NestCqrsDomainEventPublisher(eventBus as never, { maxBatchSize: 1.5 })).toThrow(
            'maxBatchSize',
        );
    });

    it('creates backward-compatible and configurable providers', () => {
        expect(createNestCqrsDomainEventPublisherProvider()).toEqual({
            provide: DOMAIN_EVENT_PUBLISHER,
            useClass: NestCqrsDomainEventPublisher,
        });

        const providers = createNestCqrsDomainEventPublisherProviders({ mode: 'parallel', maxConcurrency: 2 });
        expect(providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: NEST_CQRS_DOMAIN_EVENT_PUBLISHER_OPTIONS,
                    useValue: expect.objectContaining({ mode: 'parallel', maxConcurrency: 2, maxBatchSize: 1000 }),
                }),
                NestCqrsDomainEventPublisher,
                { provide: DOMAIN_EVENT_PUBLISHER, useExisting: NestCqrsDomainEventPublisher },
            ]),
        );
    });
});
