export interface INotificationMessage {
    readonly type: string;
    readonly action: string;
    readonly context?: any;
}

export interface INotification {
    notify(message: INotificationMessage): Promise<boolean>;
}
