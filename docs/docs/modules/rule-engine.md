---
title: 规则引擎
hide_title: true
sidebar_label: 规则引擎
---

# 规则引擎

Nestify 规则引擎简单但功能强大，提供以下功能：

* 轻巧的框架和易于学习的API
* 抽象定义业务规则并轻松应用它们
* 从基础规则创建复合规则
* 与事件总线共享事件发射器

## 安装

``` shell

$ npm install @nestify/rule-engine --save

```

或者

``` shell

$ yarn add @nestify/rule-engine

```

## 使用

在需要使用规则引擎的模块上注册 RuleEngineModule，
可以配合事件总线一起使用。

### 注册模块

``` typescript

const event = new EventEmitter();

@Module({
  imports: [
    EventBusModule.register({ event }),
    RuleEngineModule.register({
      event,
      eventPrefix: 'rule',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppSubscriber],
})
export class AppModule {}

```
### 激活规则

``` typescript

await ruleEngine.fire(rules, facts);

```

## 概念

### 规则

``` typescript

@Rule({ name: 'test', description: 'A test rule' })
class TestRule {
  @Condition()
  async condition(facts: any) {
    return 'test' === facts['value'];
  }

  @Action({ order: 1 })
  async action1(facts: any) {
    facts.value = 'action1';
    console.log('action1', facts);
  }

  @Action({ order: 2 })
  async action2(facts: any) {
    console.log('action2', facts);
  }
}

// 注册规则
const rule = ruleEngine.register(TestRule);

```

#### 使用构造器构建规则

``` typescript

const rule = new RuleBuilder()
      .name('test2')
      .priority(1)
      .when(async () => true)
      .then(async () => console.log('test2 action'))
      .build()

```

### 组合

规则将按照优先级进行排序，priority 的值越小优先级越高，默认值的优先级是最低的。

``` typescript

const rules = [];
  rules.push(ruleEngine.register(TestRule));

  rules.push(
    new RuleBuilder()
      .name('test2')
      .priority(1)
      .when(async () => true)
      .then(async () => console.log('test2 action'))
      .build(),
  );

```

### 条件

每个规则只允许有一个条件，条件返回真值的情况下，动作（action）将会被调用。

``` typescript

@Condition()
async condition(facts: any) {
  return 'test' === facts['value'];
}

```

### 动作

每个规则可以允许有多个动作，一旦规则被满足，所有动作都将按照 order 升序执行。

``` typescript

@Action({ order: 1 })
async action1(facts: any) {
  facts.value = 'action1';
  console.log('action1', facts);
}

@Action({ order: 2 })
async action2(facts: any) {
  console.log('action2', facts);
}

```

### 事实

事实是一个对象，它将被应用于每一条规则，并且在每个动作执行时都可以修改事实的值。

``` typescript 

const facts = { value: 'test' };

```

## 触发事件

规则引擎激活时会触发多个事件，
${eventPrefix} 表示从模块配置中传入的事件前缀，默认值是 rule-engine，
${ruleName} 表示自定义的规则名称，默认名称为 rule。

| 事件名                             | 触发时机
| :---                              | :---
| `${eventPrefix}:before`      | 所有规则执行之前
| `${eventPrefix}:after`       | 所有规则执行之后
| `${eventPrefix}:${ruleName}:beforeEvaluate`      | 指定规则的条件被评估之前
| `${eventPrefix}:${ruleName}:afterEvaluate`      | 指定规则的条件被评估不满足之后
| `${eventPrefix}:${ruleName}:beforeExecute`      | 指定规则的每个动作被执行之前
| `${eventPrefix}:${ruleName}:onSuccess`      | 指定规则的每个动作执行成功之后
| `${eventPrefix}:${ruleName}:onFailure`      | 指定规则的每个动作执行失败之后

## 例子

完整的例子请查看[此处](https://github.com/ZhiXiao-Lin/nestify/tree/master/examples/05-rule-engine)
