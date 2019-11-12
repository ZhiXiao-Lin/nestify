import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailerModule } from '@nestify/mailer';

@Module({
  imports: [
    // MailerModule.register({
    //   transport: {
    //     host: 'smtp.qq.com',
    //     port: 465,
    //     secure: true, // true for 465, false for other ports
    //     auth: {
    //       user: process.env.AUTH_USER,
    //       pass: process.env.AUTH_PASS
    //     },
    //     tls: {
    //       rejectUnauthorized: false
    //     }
    //   },
    //   template: {
    //     adapter: new ArtAdapter({
    //       debug: true,
    //       extname: '.html'
    //     })
    //   }
    // })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
