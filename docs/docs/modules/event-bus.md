---
title: 事件总线
hide_title: true
sidebar_label: 事件总线
---

### 邮件模块

Nestify 事件总线基于 Node.js 原生的 events 模块实现，
使用事件总线可以让程序高度解耦。

我们可以将任务都发送给事件总线，然后事件总线分发给不同的订阅者，订阅者根据自己的业务逻辑选择将耗时任务发送到哪一个任务队列。

### 安装

``` shell

$ npm install @nestify/event-bus --save

```

或者

``` shell

$ yarn add @nestify/event-bus

```

### 使用

定义一个 Subscriber

``` typescript

import { Subscriber, Listener } from '@nestify/event-bus';

@Subscriber()
export class AppSubscriber {
  @Listener({ event: 'newRequest' })
  async newRequest(eventData: any) {
    console.log(eventData);
  }
}

```

在需要使用事件总线的模块上注册 EventBusModule，同时要将 Subscriber 加入到 providers 数组。

``` typescript

@Module({
  imports: [
    EventBusModule.register(),
  ],
  providers: [AppSubscriber],
})
export class AppModule {}

```

发射事件

``` typescript

import { Injectable } from '@nestjs/common';
import { EventBusService } from '@nestify/event-bus';

@Injectable()
export class AppService {
  constructor(private readonly event: EventBusService) {}

  async getHello() {
    const msg = 'Hello World!';

    const result = await this.event.emit('newRequest', msg);

    return msg;
  }
}

```

### 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/04-event-bus)
