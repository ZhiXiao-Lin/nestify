import { SetMetadata, Inject } from '@nestjs/common';
import { EVENT_BUS_LISTENER, EVENT_BUS_SUBSCRIBER, EVENT_BUS_OPTIONS } from './event-bus.constants';
import { ListenerDecoratorOptions, SubscriberDecoratorOptions } from './event-bus.interfaces';

export const Subscriber = (options: SubscriberDecoratorOptions = {}): ClassDecorator => SetMetadata(EVENT_BUS_SUBSCRIBER, options);

export const Listener = (options: ListenerDecoratorOptions): MethodDecorator => SetMetadata(EVENT_BUS_LISTENER, options || {});

export const InjectEventBusModuleOptions = (): ParameterDecorator => Inject(EVENT_BUS_OPTIONS);
