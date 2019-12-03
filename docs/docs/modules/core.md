---
title: 核心模块
hide_title: true
sidebar_label: 核心模块
---

# 核心模块

Nestify 核心模块包含许多重要的基础功能

## 安装

``` shell

$ npm install @nestify/core --save

```

或者

``` shell

$ yarn add @nestify/core

```

## 元数据勘探者

Nestify core 模块提供了一个专门用于扫描 Nest IOC 中模块元数据的工具类 MetadataExplorer

``` typescript

import { MetadataExplorer } from '@nestify/core';

```

``` MetadataExplorer#getComponents ``` 静态方法用于扫描所有组件

``` MetadataExplorer#getProperties ``` 静态方法用于扫描组件实例上的所有属性


下面是一个扫描 IOC 中所有 Repository 的例子

``` typescript

import { MetadataExplorer } from '@nestify/core';
import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { REPOSITORY, REPOSITORY_LISTENER } from './core.constants';
import { RepositoryEvents } from './core.enums';
import { BaseInjectable } from './core.injectable';

@Injectable()
export class CoreExplorer extends BaseInjectable implements OnModuleInit {
    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {
        super();
    }

    onModuleInit() {
        this.explore();
    }

    public explore() {
        const components = MetadataExplorer.getComponents([...this.modulesContainer.values()]);

        components
            .filter(({ metatype }: InstanceWrapper) => this.isRepository(metatype))
            .forEach(({ instance, name }: InstanceWrapper) => {
                this.logger.debug(`Start scanning ${name}...`);

                MetadataExplorer.getProperties(instance).forEach((key) => {
                    if (this.isListener(instance[key])) {
                        this.handleListener(instance, key, this.getListenerMetadata(instance[key]));
                    }
                });

                this.logger.debug(`${name} scanned`);
            });
    }

    private isRepository(target: Type<any> | Function): boolean {
        return !!this.reflector.get(REPOSITORY, target);
    }

    private isListener(target: Type<any> | Function): boolean {
        return !!this.reflector.get(REPOSITORY_LISTENER, target);
    }

    private handleListener(instance: any, key: string, event: RepositoryEvents) {
        this.logger.debug(`${event}_${instance.model.modelName} event has been bound to method ${key}`);
        return this.event.subscribe(`${event}_${instance.model.modelName}`, instance[key].bind(instance));
    }

    private getListenerMetadata(target: Type<any> | Function): any {
        return this.reflector.get(REPOSITORY_LISTENER, target);
    }
}


```


## 特性（Trait）

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
## 内置特性

### FrequenciesTrait

该特性提供一系列便捷方法用于设置 Cron 计划任务表达式

| 方法                              | 描述
| :---                              | :---     
| cron('* * * * *');                | 自定义 Cron 计划执行任务
| everyMinute();                    | 每分钟执行一次任务
| everyFiveMinutes();               | 每五分钟执行一次任务
| everyTenMinutes();                | 每十分钟执行一次任务
| everyFifteenMinutes();            | 每十五分钟执行一次任务
| everyThirtyMinutes();             | 每三十分钟执行一次任务
| hourly();                         | 每小时执行一次任务
| hourlyAt(17);                     | 每小时第 17 分钟执行一次任务
| daily();                          | 每天零点执行一次任务
| dailyAt('13:00');                 | 每天 13 点执行一次任务
| twiceDaily(1, 13);                | 每天 1 点及 13 点各执行一次任务
| weekly();                         | 每周执行一次任务
| weeklyOn(1, '8:00');              | 每周一的 8 点执行一次任务
| monthly();                        | 每月执行一次任务
| monthlyOn(4, '15:00');            | 每月 4 号的 15 点 执行一次任务
| quarterly();                      | 每季度执行一次任务
| yearly();                         | 每年执行一次任务
| timezone('America/New_York');     | 设置时区

结合额外的限制条件，我们可以生成在一周中的特定时间运行的计划任务。例如，在每周一执行命令：

``` typescript
// 每周一 13:00 执行
schedule.weekly().mondays().at('13:00').run();

// 工作日（周一至周五） 8:00 和 15:00 各执行一次
schedule.weekdays()
        .twiceDaily(8, 15)
        .run();
```

| 方法              | 描述
| :---              | :--- 
| weekdays();       | 限制任务在工作日执行
| weekends();       | 限制任务在周末执行
| sundays();        | 限制任务在周日执行
| mondays();        | 限制任务在周一执行
| tuesdays();       | 限制任务在周二执行
| wednesdays();     | 限制任务在周三执行
| thursdays();      | 限制任务在周四执行
| fridays();        | 限制任务在周五执行
| saturdays();      | 限制任务在周六执行
| days();           | 限制任务在一周中的哪几天运行