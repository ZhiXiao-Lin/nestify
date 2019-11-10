---
title: 模块规范
hide_title: true
sidebar_label: 模块规范
---

### Nestify 模块规范

在[此处](https://docs.nestjs.com/fundamentals/dynamic-modules)了解如何编写 NestJS 动态模块

Nestify 要求 NestJS 模块提供统一的注册方法

同步注册的方法签名

``` typescript

  public static register: (...args: any[]) => DynamicModule;

```

异步注册的方法签名

``` typescript

  public static registerAsync: (...args: any[]) => DynamicModule;

```

一个 Nestify 标准模块的例子

``` typescript

import { DynamicModule, Global, Module } from '@nestjs/common';
import { NOTIFICATION_MODULE_OPTIONS } from './notification.constants';
import { 
  NotificationModuleAsyncOptions, 
  NotificationModuleOptions 
} from './notification.interfaces';
import { NotificationService } from './notification.service';

@Global()
@Module({
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationModule {
    public static register(
      options: NotificationModuleOptions
    ): DynamicModule {
        const providers = [
            {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useValue: options
            }
        ];

        return {
            module: NotificationModule,
            providers: providers,
            exports: providers
        };
    }

    public static registerAsync(
      options: NotificationModuleAsyncOptions
    ): DynamicModule {
        const providers = [
            {
                provide: NOTIFICATION_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: NotificationModule,
            imports: options.imports,
            providers: providers,
            exports: providers
        };
    }
}

```
