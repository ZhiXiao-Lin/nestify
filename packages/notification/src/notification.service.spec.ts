import { NotificationService } from './notification.service';
import { INotifiable } from '@nestify/core';

class SmsNotification implements INotifiable {
    async send(): Promise<boolean> {
        return true;
    }
}

class MailNotification implements INotifiable {
    async send(): Promise<boolean> {
        return true;
    }
}

class BroadcastNotification implements INotifiable {
    async send(): Promise<boolean> {
        return false;
    }
}

describe('Notification Service', () => {
    let service: NotificationService;

    beforeEach(async () => {
        service = new NotificationService();
    });

    it('Notification should be sent successfully', async () => {
        const res = await service.notify(new SmsNotification());

        expect(res).toEqual(true);
    });

    it('Multiple notifications should be sent successfully', async () => {
        const res = await service.notify(new SmsNotification(), new MailNotification());

        expect(res).toEqual(true);
    });

    it('If any notice fails to be sent, it will return failure', async () => {
        const res = await service.notify(new SmsNotification(), new MailNotification(), new BroadcastNotification());

        expect(res).toEqual(false);
    });
});
