import { TaskStatus } from '../workflow.enums';
import { ITask } from '../workflow.interfaces';
import { SequentialFlowBuilder } from './sequential.flow';
import { TaskResult } from './task-result';
import { WorkFlowEngine, WorkFlowEngineBuilder } from './workflow-engine';

describe('WorkFlowEngine', () => {

    class MyTask implements ITask {
        constructor(private msg: string) { }

        public getName() {
            return 'MyTask';
        }

        public async call() {
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
});
