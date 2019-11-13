import { MailerService } from '@nestify/mailer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const mailer = app.get(MailerService);

  await app.listenAsync(3000);

  console.log(
    await mailer.send({
      from: '1002591652@qq.com',
      to: 'linzhixiao1996@gmail.com', // list of receivers
      subject: 'This is a test mail', // Subject line
      template: process.cwd() + '/welcome.html',
      context: {
        value: 'nest mailer',
      },
    }),
  );
}
bootstrap();
