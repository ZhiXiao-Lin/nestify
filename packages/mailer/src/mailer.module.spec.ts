import { Test, TestingModule } from '@nestjs/testing';
import { ArtAdapter } from './adapters/art.adapter';
import { MAILER_TRANSPORTER } from './mailer.constants';
import { MailerModuleOptions, MailerModuleAsyncOptions } from './mailer.interfaces';
import { MailerModule } from './mailer.module';
import { MailerService } from './mailer.service';

describe('Mailer Module', () => {
    it('Will boot mailer module succesfully', async () => {
        const options: MailerModuleOptions = {
            transport: {
                host: 'smtp.qq.com',
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                    user: process.env.AUTH_USER,
                    pass: process.env.AUTH_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            },
            template: {
                adapter: new ArtAdapter({
                    debug: true,
                    extname: '.html'
                })
            }
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [MailerModule.register(options)]
        }).compile();

        const service = module.get(MailerService);
        const transporter = module.get(MAILER_TRANSPORTER);

        expect(service).toBeDefined();
        expect(transporter).toBeDefined();
    });

    it('Will boot mailer module succesfully async', async () => {
        const options: MailerModuleAsyncOptions = {
            useFactory: async () => {
                return {
                    transport: {
                        host: 'smtp.qq.com',
                        port: 465,
                        secure: true, // true for 465, false for other ports
                        auth: {
                            user: process.env.AUTH_USER,
                            pass: process.env.AUTH_PASS
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    },
                    template: {
                        adapter: new ArtAdapter({
                            debug: true,
                            extname: '.html'
                        })
                    }
                };
            }
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [MailerModule.registerAsync(options)]
        }).compile();

        const service = module.get(MailerService);
        const transporter = module.get(MAILER_TRANSPORTER);

        expect(service).toBeDefined();
        expect(transporter).toBeDefined();
    });
});
