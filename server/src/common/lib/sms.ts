import * as SuperAgent from 'superagent';
import { Logger } from './logger';

export enum SMSTemplates {
    USER_REGISTER = 'USER_REGISTER',
    PASSWORD_RESET = 'PASSWORD_RESET'
}

// SMS_ACCOUNT=xxx
// SMS_SECRET=xxx
// SMS_URL=http://smssh1.253.com/msg/send/json
// SMS_DOMAIN=smssh1.253.com

export class SMS {
    static templates: object = {
        USER_REGISTER:
            '【文明实践中心】尊敬的用户，您的注册验证码是{$var}, {$var}分钟内有效, 打死都不要告诉别人！',
        PASSWORD_RESET: '【文明实践中心】尊敬的{$var}，您好，您的密码是：{$var}，{$var}分钟内有效'
    };

    static async sendMessage(phonenumber: string, template: SMSTemplates, parameters: string[]) {
        let msg = SMS.templates[template];
        parameters.forEach((item, index) => (msg = msg.replace(`{s${index + 1}}`, item)));

        Logger.debug('Send SMS', phonenumber, msg);

        try {
            return await SuperAgent.post(process.env['SMS_URL'])
                .set('Content-Type', 'application/json; charset=UTF-8')
                .send({
                    account: process.env['SMS_ACCOUNT'],
                    password: process.env['SMS_SECRET'],
                    msg,
                    phone: phonenumber
                });
        } catch (err) {
            Logger.error(err);
        }
    }
}
