import { ConditionalFlowBuilder, NoOpTask, ParallelFlowBuilder, RaceFlowBuilder, RepeatFlowBuilder, SequentialFlowBuilder, TaskPredicate, TaskResult, TaskStatus, WorkFlowService } from '@nestify/workflow';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const wait = (timeout) => new Promise((resolve) => setTimeout(() => resolve(), timeout));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

class MyTask extends NoOpTask {
  constructor(private readonly msg: string) {
    super();
  }

  public async call() {
    console.log(`Task:${this.Name}:${this.msg}`);
    await wait(rand(0, 1) * 100);
    return new TaskResult(TaskStatus.COMPLETED);
  }
}

let t1 = new MyTask('t1');
let t2 = new MyTask('t2');
let t3 = new MyTask('t3');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const workflowEngine = app.get(WorkFlowService);

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
          .catch(t3)
          .build()
      )
      .build()
  );

  console.log(result);

  await app.listen(3000);
}
bootstrap();
