---
title: 核心模块
hide_title: true
sidebar_label: 核心模块
---

### 核心模块

Nestify 核心模块包含许多重要的基础功能

### 安装

``` shell

$ npm install @nestify/core --save

```

或者

``` shell

$ yarn add @nestify/core

```

### 特性（Trait）

实现类似于 PHP 中的 trait 功能，可以简单的理解为多继承。

下面这个例子展示了我们定义 Frequencies 和 Queue 这两个 Trait，他们之间没有相关性。

我们的调度器 Schedule 需要同时具备 *** 管理任务频次 *** 和 *** 让任务在队列中运行 *** 这两种能力。

又因为 Frequencies 和 Queue 没有相关性，使用继承在逻辑上是说不通的，所以使用 trait 来实现。

``` typescript

import { Trait, UseTraits } from '@nestify/core';

abstract class FrequenciesTrait extends Trait {
    public expression: string = '* * * * *';

    public cron(expression: string) {
        this.expression = expression;
        return this;
    }

    public everyMinute() {
        console.log('FrequenciesTrait: everyMinute');
        return this.cron('* 1 * * *');
    }
}

abstract class QueueTrait extends Trait {
    private job: any;

    public async push(options: any) {
        console.log('QueueTrait.push', options);
        return await this.job();
    }
}

@UseTraits(FrequenciesTrait, QueueTrait)
class Schedule {
    // 因为没有直接的继承关系，所以需要使用这种方式让 TypeScript 具备智能感知
    private readonly that = (this as unknown) as Schedule & FrequenciesTrait & QueueTrait;
    public job: any;

    public call(callback: any) {
        this.job = callback;
        return this.that;
    }

    public async runInQueue() {
        return await this.that.push({ corn: this.that.expression });
    }
}

(async () => {
    await schedule
            .call(async () => true)
            .everyMinute()
            .runInQueue();
})();

```
