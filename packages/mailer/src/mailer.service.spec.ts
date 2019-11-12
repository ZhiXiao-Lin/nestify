import * as dotenv from 'dotenv';
import * as mailer from 'nodemailer';
import { ArtAdapter } from './adapters/art.adapter';
import { ISendMailOptions, MailerModuleOptions } from './mailer.interfaces';
import { MailerService } from './mailer.service';

dotenv.config();

describe('Mailer Service', () => {

    let service: MailerService;

    beforeEach(async () => {

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
                },
            },
            template: {
                adapter: new ArtAdapter({
                    debug: true,
                    extname: '.html'
                })
            },
        };

        const transporter = mailer.createTransport(options.transport, options.defaults);

        service = new MailerService(options, transporter);
    });

    it('Mailer service should be defined', () => {
        expect(service).toBeDefined();
    });

    it('Will return sent message id', async () => {

        const options: ISendMailOptions = {
            from: '1002591652@qq.com', // sender address
            to: 'linzhixiao1996@gmail.com', // list of receivers
            subject: 'This is a test mail', // Subject line
            template: process.cwd() + '/welcome.html',
            context: {
                value: 'nest mailer'
            }
        };

        const res: mailer.SentMessageInfo = await service.send(options);

        console.log(res);

        expect(res.messageId).toBeTruthy();
    });
});
