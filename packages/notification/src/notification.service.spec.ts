import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { Action, Notifiable } from './notification.decorators';
import { NotificationModule } from './notification.module';
import { NotificationService } from './notification.service';

@Injectable()
class TestService { }

@Notifiable('sms')
class SmsNotification {
    constructor(public readonly testService: TestService) { }

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

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [NotificationModule.register({ event: new EventEmitter() })],
            providers: [TestService, SmsNotification, MailNotification, BroadcastNotification]
        }).compile();

        service = module.get(NotificationService);

        service.onModuleInit();
    });

    it('Dependency injection should be correct', () => {
        expect(module.get(SmsNotification).testService).toBeDefined();
    });

    it('Notification should be sent successfully', async () => {
        const res1 = await service.notify({ type: 'sms', action: 'register', context: { mobile: 'mobile', code: '1234' } });
        const res2 = await service.notify({ type: 'sms', action: 'reset-pass', context: { mobile: 'mobile', code: '5678' } });
        const res3 = await service.notify({ type: 'mail', action: 'welcome', context: { email: 'email' } });
        const res4 = await service.notify({ type: 'broadcast', action: 'order-shipped', context: { email: 'email' } });

        expect(res1).toEqual(true);
        expect(res2).toEqual(true);
        expect(res3).toEqual(true);
        expect(res4).toEqual(false);
    });
});
