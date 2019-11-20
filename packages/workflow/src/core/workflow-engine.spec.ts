import { TaskStatus } from '../workflow.enums';
import { ITask } from '../workflow.interfaces';
import { SequentialFlowBuilder } from './sequential.flow';
import { ParallelFlowBuilder } from './parallel.flow';
import { TaskResult } from './task-result';
import { WorkFlowEngine, WorkFlowEngineBuilder } from './workflow-engine';

const wait = timeout => new Promise((resolve, reject) => setTimeout(() => resolve(), timeout));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

describe('WorkFlowEngine', () => {

    class MyTask implements ITask {
        constructor(private msg: string) { }

        public getName() {
            return 'MyTask';
        }

        public async call() {
            await wait(rand(1, 3) * 100);
            console.log(this.msg);
            return new TaskResult(TaskStatus.COMPLETED);
        }
    }

    let t1 = new MyTask('t1');
    let t2 = new MyTask('t2');
    let t3 = new MyTask('t3');

    let workFlowEngine: WorkFlowEngine;

    beforeAll(async () => {
        workFlowEngine = WorkFlowEngineBuilder.newWorkFlow().build();
    });

    it('The SequentialFlow should be executed correctly', async () => {

        const result = await workFlowEngine.run(
            SequentialFlowBuilder
                .newFlow()
                .name('test flow')
                .execute(t1)
                .then(t2)
                .then(t3)
                .build()
        );

        expect(result.getStatus()).toEqual(TaskStatus.COMPLETED);
    });

    it('The ParallelFlow should be executed correctly', async () => {

        const result = await workFlowEngine.run(
            ParallelFlowBuilder
                .newFlow()
                .name('test flow')
                .execute(t1, t2, t3)
                .build()
        );

        expect(result.getStatus()).toEqual(TaskStatus.COMPLETED);
    });
});
