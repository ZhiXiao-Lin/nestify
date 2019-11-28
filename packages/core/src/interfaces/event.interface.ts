export interface IEventPublisher {
    publish(eventName: string | symbol, data?: any): boolean;
}
