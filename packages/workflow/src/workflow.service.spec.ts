import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { TaskResult } from './core';
import { RaceFlow, RaceFlowBuilder } from './flows';
import { NoOpTask } from './tasks';
import { TaskStatus } from './workflow.enums';
import { WorkFlowModule } from './workflow.module';
import { WorkFlowService } from './workflow.service';

const wait = (timeout) => new Promise((resolve) => setTimeout(() => resolve(), timeout));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

describe('WorkFlow Service', () => {
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

    let module: TestingModule;
    let service: WorkFlowService;
    let event = new EventEmitter();
    let raceFlow: RaceFlow;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [WorkFlowModule.register({ event, eventPrefix: 'workflow' })]
        }).compile();

        service = module.get(WorkFlowService);
    });

    beforeEach(() => {
        raceFlow = RaceFlowBuilder.newFlow()
            .name('RaceFlow')
            .execute(t1, t2, t3)
            .build();
    });

    it('WorkFlow should be run', async () => {
        const reuslt = await service.run(raceFlow);

        expect(reuslt.getStatus()).toEqual(TaskStatus.COMPLETED);
    });
});
