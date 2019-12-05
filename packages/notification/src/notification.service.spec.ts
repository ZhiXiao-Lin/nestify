import { INotificationMessage } from '@nestify/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Action, Notifiable } from './notification.decorators';
import { NotificationModule } from './notification.module';
import { NotificationService } from './notification.service';

@Notifiable('sms')
class SmsNotification {
    @Action('register')
    async register(registerInfo: any): Promise<boolean> {
        console.log('registerInfo', registerInfo);
        return true;
    }

    @Action('reset-pass')
    async resetPass(resetPassInfo: any): Promise<boolean> {
        console.log('resetPassInfo', resetPassInfo);
        return true;
    }
}

@Notifiable('mail')
class MailNotification {
    @Action('welcome')
    async welcome(userInfo: any): Promise<boolean> {
        console.log('welcome', userInfo);
        return true;
    }
}

@Notifiable('broadcast')
class BroadcastNotification {
    @Action('order-shipped')
    async orderShipped(orderInfo: any): Promise<boolean> {
        console.log('orderInfo', orderInfo);
        return false;
    }
}

describe('Notification Service', () => {
    let module: TestingModule;
    let service: NotificationService;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [NotificationModule],
            providers: [SmsNotification, MailNotification, BroadcastNotification],
            exports: [NotificationModule]
        }).compile();

        service = module.get(NotificationService);
    });

    it('Notification should be sent successfully', async () => {
        const res1 = await service.notify({ type: 'sms', action: 'register', context: { mobile: 'mobile', code: '1234' } });
        const res2 = await service.notify({ type: 'sms', action: 'reset-pass', context: { mobile: 'mobile', code: '5678' } });
        const res3 = await service.notify({ type: 'mail', action: 'welcome', context: { email: 'email' } });

        expect(res1).toEqual(true);
        expect(res2).toEqual(true);
        expect(res3).toEqual(true);
    });

    it('Notification should be sent failed', async () => {
        const broadcastMessage: INotificationMessage = {
            type: 'broadcast',
            action: 'order-shipped',
            context: { orderId: 'orderId', userId: 'userId' }
        };

        const res = await service.notify(broadcastMessage);

        expect(res).toEqual(false);
    });
});
