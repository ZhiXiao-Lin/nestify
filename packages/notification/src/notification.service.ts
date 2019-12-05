import { INotifiable, INotification } from '@nestify/core';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService implements INotification {
    async notify(...notifiables: INotifiable[]): Promise<boolean> {
        const result = await Promise.all(notifiables.map((n) => n.send()));

        return result.every((item) => !!item);
    }
}
