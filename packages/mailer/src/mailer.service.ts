import { Injectable } from '@nestjs/common';
import { SentMessageInfo } from 'nodemailer';
import * as Mail from 'nodemailer/lib/mailer';
import { InjectMailerModuleOptions, InjectMailerTransporter } from './mailer.decorators';
import { ISendMailOptions, MailerModuleOptions, TemplateAdapter } from './mailer.interfaces';

@Injectable()
export class MailerService {
    constructor(
        @InjectMailerModuleOptions()
        private readonly options: MailerModuleOptions,
        @InjectMailerTransporter()
        private readonly transporter: Mail
    ) {

        const templateAdapter: TemplateAdapter = this.options.transport ? this.options.template.adapter : null;

        if (!!templateAdapter) {
            this.transporter.use('compile', (mail, callback) => {
                if (!!mail.data.html) {
                    return callback();
                }

                return templateAdapter.compile(mail, callback);
            });
        }
    }

    public async send(sendMailOptions: ISendMailOptions): Promise<SentMessageInfo> {
        return await this.transporter.sendMail(sendMailOptions);
    }
}