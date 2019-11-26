import { ConditionalFlowBuilder, RaceFlowBuilder, RepeatFlowBuilder } from '../flows';
import { ParallelFlowBuilder } from '../flows/parallel.flow';
import { SequentialFlowBuilder } from '../flows/sequential.flow';
import { TaskPredicate } from '../predicates/task-predicate';
import { NoOpTask } from '../tasks';
import { TaskStatus } from '../workflow.enums';
import { TaskResult } from './task-result';
import { WorkFlowEngine, WorkFlowEngineBuilder } from './workflow-engine';

const wait = (timeout) => new Promise((resolve) => setTimeout(() => resolve(), timeout));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

describe('WorkFlowEngine', () => {
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

    let workflowEngine: WorkFlowEngine;

    beforeAll(async () => {
        workflowEngine = WorkFlowEngineBuilder.newWorkFlow().build();
    });

    it('The engine should run the workflow correctly', async () => {
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

        expect(result.getStatus()).toEqual(TaskStatus.COMPLETED);
    });
});
