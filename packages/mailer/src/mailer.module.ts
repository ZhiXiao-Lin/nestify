import { DynamicModule, Module } from '@nestjs/common';
import * as mailer from 'nodemailer';
import { MAILER_MODULE_OPTIONS, MAILER_TRANSPORTER } from './mailer.constants';
import { MailerModuleAsyncOptions, MailerModuleOptions } from './mailer.interfaces';
import { MailerService } from './mailer.service';

@Module({
    providers: [MailerService],
    exports: [MailerService]
})
export class MailerModule {
    public static register(options: MailerModuleOptions): DynamicModule {
        const providers = [
            {
                provide: MAILER_TRANSPORTER,
                useValue: mailer.createTransport(options.transport, options.defaults)
            }
        ];

        return {
            module: MailerModule,
            providers: providers,
            exports: providers
        };
    }

    public static registerAsync(options: MailerModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: MAILER_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            },
            {
                provide: MAILER_TRANSPORTER,
                useFactory: (opts: MailerModuleOptions) => mailer.createTransport(opts.transport, opts.defaults),
                inject: [MAILER_MODULE_OPTIONS]
            }
        ];

        return {
            module: MailerModule,
            imports: options.imports,
            providers: providers,
            exports: providers
        };
    }
}
