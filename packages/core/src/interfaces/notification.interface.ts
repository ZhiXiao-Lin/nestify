export interface INotificationMessage {
    readonly type: string | symbol;
    readonly action: string | symbol;
    readonly context: any;
}

export interface INotification {
    notify(message: INotificationMessage): Promise<boolean>;
}
