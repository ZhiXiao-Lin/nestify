import { INotification, INotificationMessage } from '@nestify/core';
import { Injectable } from '@nestjs/common';
import { Action } from './notification.interfaces';

@Injectable()
export class NotificationService implements INotification {

    private readonly notifiables: Map<string, Action> = new Map<string, Action>();

    async notify(message: INotificationMessage): Promise<boolean> {
        // return await this.notifiables.get(`${message.type}-${message.action}`)(message.context);
        return true;
    }
}
