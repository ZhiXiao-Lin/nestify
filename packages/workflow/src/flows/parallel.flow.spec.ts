import { TaskResult } from '../core';
import { NoOpTask } from '../tasks';
import { TaskStatus } from '../workflow.enums';
import { ParallelFlowBuilder } from './parallel.flow';

const wait = (timeout) => new Promise((resolve) => setTimeout(() => resolve(), timeout));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

describe('ParallelFlow', () => {
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

    it('The flow should be defined', async () => {
        const flow = ParallelFlowBuilder.newFlow()
            .name('ParallelFlow')
            .execute(t1, t2, t3)
            .build();

        expect(flow).toBeDefined();
    });

    it('The calling flow should return the correct result', async () => {
        const result = await ParallelFlowBuilder.newFlow()
            .name('ParallelFlow')
            .execute(t1, t2, t3)
            .build()
            .call();

        expect(result.getStatus()).toEqual(TaskStatus.COMPLETED);
    });
});
