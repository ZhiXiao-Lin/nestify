import { Injectable } from '@nestjs/common';
import { EventBus as NestEventBus } from '@nestjs/cqrs';
import { IEventBus } from './event-bus.interface';
import { DomainEvent } from '@/shared/domain/domain-event';

@Injectable()
export class EventBusService implements IEventBus {
    constructor(private readonly eventBus: NestEventBus) {}

    async publish(event: DomainEvent): Promise<void> {
        await this.eventBus.publish(event);
    }

    async publishAll(events: DomainEvent[]): Promise<void> {
        await Promise.all(events.map(event => this.eventBus.publish(event)));
    }
}
