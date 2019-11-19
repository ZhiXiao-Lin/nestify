import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  RuleEngineService,
  Rule,
  Condition,
  Action,
  RuleBuilder,
} from '@nestify/rule-engine';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const ruleEngine = app.get(RuleEngineService);

  const rules = [];
  rules.push(ruleEngine.register(TestRule));

  rules.push(new RuleBuilder()
    .name('test2')
    .priority(1)
    .when(async () => true)
    .then(async () => console.log('test2 action'))
    .build()
  );

  await ruleEngine.fire(rules, { value: 'test' });

  await app.listen(3000);
}
bootstrap();
