---
title: 邮件模块
hide_title: true
sidebar_label: 邮件模块
---

### 邮件模块

Nestify 邮件模块基于 [nodemailer](https://github.com/nodemailer/nodemailer) 实现，
采用适配器模式，支持自定义邮件模版引擎。

### 安装

``` shell

$ npm install @nestify/mailer

```

或者

``` shell

$ yarn add @nestify/mailer

```

### 模板引擎
目前支持的邮件模板引擎

* [art-template](http://aui.github.io/art-template/zh-cn/index.html)

### 使用

同步注册 MailerModule

``` typescript

@Module({
  imports: [
    MailerModule.register({
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
    }),
  ]
})
export class AppModule {}

```

异步注册 MailerModule

``` typescript

@Module({
  imports: [
     MailerModule.registerAsync({
        useFactory: async (config: ConfigService) => config.get('mailer'),
        inject: [ConfigService]
    }),
  ]
})
export class AppModule {}

```

在构造函数中注入

``` typescript

import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestify/mailer';

@Injectable()
export class AppService {

  constructor(
    public readonly mailer: MailerService
  ) { }
}

```

发送邮件

``` typescript

await mailer.send({
    from: '1002591652@qq.com',
    to: 'linzhixiao1996@gmail.com', // 多个邮件接收人用逗号分隔
    subject: 'This is a test mail',
    template: process.cwd() + '/welcome.html',
    context: {
        value: 'nest mailer'
    }
});

```

### 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/03-mailer)
