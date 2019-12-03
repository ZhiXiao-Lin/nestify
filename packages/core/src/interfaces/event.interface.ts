export interface IEventPublisher {
    publish(eventName: string | symbol, data?: any): boolean;
    subscribe(eventName: string | symbol, callback: (...args: any[]) => Promise<any>): any;
}
