import { INotifiable } from './notifiable.interface';

export interface INotification {
    notify(...notifiables: INotifiable[]): Promise<boolean>;
}
