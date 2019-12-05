import { Action, Notifiable } from '@nestify/notification';

@Notifiable('user')
export class UserNotifiable {
    @Action('register-sms')
    async register(registerDto) {
        console.log('user-register-sms', registerDto);
    }
}
