---
title: 配置模块
hide_title: true
sidebar_label: 配置模块
---

# 配置模块

Nestify 提供一个开箱即用的配置模块

## 安装

``` shell

$ npm install @nestify/config --save

```

或者

``` shell

$ yarn add @nestify/config

```

## 使用

注册 ConfigModule

``` typescript

import { ConfigModule } from '@nestify/config';

@Module({
  imports: [
    ConfigModule.register(
      path.resolve(__dirname, 'config', '**/!(*.d).{ts,js}'),
    ),
  ]
})
export class AppModule {}

```

### 环境变量

在项目中新建 env 文件夹存放环境变量文件，ConfigModule 通过 [dotenv](https://github.com/motdotla/dotenv) 库提供环境变量支持

```
|- src
 |- env
  |- .env.development
  |- .env.production

```

一个 .env.development 文件的例子

``` yaml

NODE_ENV=development
PORT=8888

```

ConfigModule 的 initEnvironment 静态方法接收两个参数：

``` typescript

rootPath: string;  // 环境变量文件所在的文件夹
env?: string; // 当前 NODE_ENV，默认是 development

```

在框架启动之前加载环境变量文件，这将加载 .env.{当前环境变量} 文件中的环境变量值

``` typescript

import { ConfigModule, ConfigService } from '@nestify/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  ConfigModule.initEnvironment(process.cwd() + '/src/env');

  const app = await NestFactory.create(AppModule);
  const config: ConfigService = app.get(ConfigService);

  await app.listen(config.get('app.port'));
}
bootstrap();

```

### 配置文件

在项目中新建 config 文件夹存放配置文件

```
|- src
 |- config
  |- app.ts
  |- database.ts
```

一个配置文件的例子

``` typescript

import { env } from '@nestify/config';

export default {
    env: env('NODE_ENV'),
    port: env('PORT'),
    prefix: 'api',
    salt: env('SALT'),
    isDev() {
        const env = this.get('app.env');
        return env === 'development';
    },
    cors: { origin: '*' }
};

```

使用 env 函数可以便捷的获取当前环境变量

文件名为 app.ts 的配置，可以通过 ``` config.get('app') ``` 来获取配置文件的所有内容

而 ``` config.get('app.port') ``` 则只获取该文件导出对象的 port 属性的值

配置中定义的函数可以这样访问 ``` config.get('app').isDev() ```

## 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/01-config)
