import { DOMAIN_EVENT_PUBLISHER, DomainEvent } from '@a3s-lab/ddd';
import { createNestCqrsDomainEventPublisherProvider, NestCqrsDomainEventPublisher } from '../index';

class TestDomainEvent extends DomainEvent {
    constructor(private readonly aggregateId: string) {
        super();
    }

    getAggregateId(): string {
        return this.aggregateId;
    }
}

describe('NestCqrsDomainEventPublisher', () => {
    it('publishes one domain event through the Nest CQRS event bus', async () => {
        const eventBus = { publish: jest.fn() };
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never);
        const event = new TestDomainEvent('resource-1');

        await publisher.publish(event);

        expect(eventBus.publish).toHaveBeenCalledWith(event);
    });

    it('publishes all domain events', async () => {
        const eventBus = { publish: jest.fn() };
        const publisher = new NestCqrsDomainEventPublisher(eventBus as never);
        const events = [new TestDomainEvent('resource-1'), new TestDomainEvent('resource-2')];

        await publisher.publishAll(events);

        expect(eventBus.publish).toHaveBeenCalledTimes(2);
        expect(eventBus.publish).toHaveBeenNthCalledWith(1, events[0]);
        expect(eventBus.publish).toHaveBeenNthCalledWith(2, events[1]);
    });

    it('creates a provider for the DDD publisher token', () => {
        expect(createNestCqrsDomainEventPublisherProvider()).toEqual({
            provide: DOMAIN_EVENT_PUBLISHER,
            useClass: NestCqrsDomainEventPublisher,
        });
    });
});
