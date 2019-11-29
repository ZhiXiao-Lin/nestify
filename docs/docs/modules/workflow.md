---
title: 流程引擎
hide_title: true
sidebar_label: 流程引擎
---

# 流程引擎

Nestify 流程引擎简单明了，使用它可以轻松创建可组合的工作流。

## 安装

``` shell

$ npm install @nestify/workflow --save

```

或者

``` shell

$ yarn add @nestify/workflow

```

## 使用

在需要使用流程引擎的模块上注册 WorkFlowModule，
可以配合事件总线一起使用。

### 注册模块

``` typescript

@Module({
  imports: [
    WorkFlowModule.register({
      event: new EventEmitter(),
      eventPrefix: 'workflow'
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

```
### 启动流程

``` typescript

await workflowEngine.run(flow);

```

## 概念

### 引擎

负责流程的启动

### 任务

流程引擎执行的最小单元, 流程本身是一个任务。

### 任务结果

每个任务运行后都有一个返回结果，只有两个值 成功 或 失败。

## 流程

流程是一系列任务的组合，根据流程执行的时机和顺序的不同，流程可以被分为以下几类：

### 顺序流

按照线性顺序执行的流程

``` typescript

const result = await SequentialFlowBuilder.newFlow()
    .name('SequentialFlow')
    .execute(t1)
    .then(t2)
    .then(t3)
    .build()
    .call();

```

### 重复流

按照指定的条件重复运行的流程

``` typescript

const result = await RepeatFlowBuilder.newFlow()
            .name('RepeatFlow')
            .repeat(t1)
            .frequencies(1)
            .build()
            .call();

```

### 条件流

按照指定的条件进行分叉的流程

``` typescript

const flow = ConditionalFlowBuilder.newFlow()
        .name('ConditionalFlow')
        .execute(t1)
        .when(TaskPredicate.COMPLETED)
        .then(t2)
        .other(t3)
        .build();

```

### 并行流

同时执行多个任务，等待所有任务执行完成才会返回结果，任意一个任务失败则整个流程都视为失败

``` typescript

const result = await ParallelFlowBuilder.newFlow()
        .name('ParallelFlow')
        .execute(t1, t2, t3)
        .build()
        .call();

```

### 竞争流

同时执行多个任务，以第一个任务的返回结果作为整个流程的结果，其它未完成的任务将不在继续执行

``` typescript

const result = await RaceFlowBuilder.newFlow()
            .name('RaceFlow')
            .execute(t1, t2, t3)
            .build()
            .call();

```

### 流程组合

可以将任意流程和任务进行组合，从而定义完整的业务逻辑。

``` typescript 

const result = await workflowEngine.run(
    SequentialFlowBuilder.newFlow()
      .name('SequentialFlow')
      .execute(
        RepeatFlowBuilder.newFlow()
          .name('RepeatFlow')
          .repeat(t1)
          .frequencies(2)
          .build()
      )
      .then(
        ConditionalFlowBuilder.newFlow()
          .name('ConditionalFlow')
          .execute(
            ParallelFlowBuilder.newFlow()
              .name('ParallelFlow')
              .execute(t2, t3)
              .build()
          )
          .when(TaskPredicate.COMPLETED)
          .then(
            RaceFlowBuilder.newFlow()
              .name('RaceFlow')
              .execute(t1, t2, t3)
              .build()
          )
          .other(t3)
          .build()
      )
      .build()
  );

```


## 触发事件

流程引擎启动时会触发多个事件，
${eventPrefix} 表示从模块配置中传入的事件前缀，默认值是 workflow，
${workflowName} 表示自定义的流程名称。

| 事件名                             | 触发时机
| :---                              | :---
| `${eventPrefix}:${workflowName}:before`      | 引擎执行流程之前
| `${eventPrefix}:${workflowName}:after`       | 引擎执行流程之后

## 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/06-workflow)
