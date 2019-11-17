---
title: 日志模块
hide_title: true
sidebar_label: 日志模块
---

# 日志模块

Nestify 日志模块基于 [winston](https://github.com/winstonjs/winston) 实现，
winston 是一个优秀的 node.js 日志模块，支持多种日志级别、传输方式以及自定义日志格式。

## 安装

``` shell

$ npm install @nestify/logger --save

```

或者

``` shell

$ yarn add @nestify/logger

```

## 使用

同步注册 LoggerModule

``` typescript

@Module({
  imports: [
    LoggerModule.register({
      transports: [new transports.Console()],
    }),
  ]
})
export class AppModule {}

```

异步注册 LoggerModule

``` typescript

@Module({
  imports: [
     LoggerModule.registerAsync({
        useFactory: async (config: ConfigService) => config.get('logger'),
        inject: [ConfigService]
    }),
  ]
})
export class AppModule {}

```

在构造函数中注入

``` typescript

import { Injectable } from '@nestjs/common';
import { InjectLogger } from '@nestify/logger';
import { Logger } from 'winston';

@Injectable()
export class AppService {

  constructor(
    @InjectLogger()
    public readonly logger: Logger
  ) { }

  getHello(): string {
    this.logger.info('Hello World');
    return 'Hello World!';
  }
}

```

在 nest 上下文中获取

``` typescript

import { LOGGER_MODULE_PROVIDER } from '@nestify/logger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(LOGGER_MODULE_PROVIDER);

  const res = await app.listenAsync(3000);

  logger.info('logger');
  logger.info(res);
}
bootstrap();

```

## 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/02-logger)
