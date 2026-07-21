import { DOMAIN_EVENT_PUBLISHER, type DomainEvent, type IDomainEventPublisher } from '@a3s-lab/ddd';
import { Injectable, type Provider } from '@nestjs/common';
import { EventBus as NestEventBus } from '@nestjs/cqrs';

@Injectable()
export class NestCqrsDomainEventPublisher implements IDomainEventPublisher {
    constructor(private readonly eventBus: NestEventBus) {}

    async publish(event: DomainEvent): Promise<void> {
        await this.eventBus.publish(event);
    }

    async publishAll(events: readonly DomainEvent[]): Promise<void> {
        await Promise.all(events.map(event => this.publish(event)));
    }
}

export function createNestCqrsDomainEventPublisherProvider(): Provider {
    return {
        provide: DOMAIN_EVENT_PUBLISHER,
        useClass: NestCqrsDomainEventPublisher,
    };
}
