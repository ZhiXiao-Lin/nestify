import { ModuleMetadata } from '@nestjs/common/interfaces';
import { SendMailOptions } from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface ISendMailOptions extends SendMailOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    template?: string,
    context?: { [name: string]: any; }
}

export interface TemplateAdapter {
    compile(mail: any, callback: (err?: any, body?: string) => any): void;
}

export interface MailerModuleOptions {
    defaults?: SMTPTransport.Options;
    transport?: SMTPTransport | SMTPTransport.Options | string;
    template?: {
        adapter?: TemplateAdapter;
        options?: { [name: string]: any; };
    };
}

export interface MailerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<MailerModuleOptions> | MailerModuleOptions;
    inject?: any[];
}
