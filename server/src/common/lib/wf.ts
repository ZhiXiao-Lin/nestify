import { Logger } from './logger';
import { mq, MQChannel } from './mq';

// 步骤： 执行的最小单元
export class Step {

    private readonly executor: Function;

    async execute(): Promise<boolean> {
        return await this.executor();
    }
}

// 任务: 调度的最小单元，多个 Step 的执行流程，串行或并行执行一组 Step
export class Task {

    async append(step: Step) { }

    async appendParallel(steps: Step[]) { }
}

// 流程：多个 Task 的执行流程，串行执行一组 Task
export class Flow {

    async append(task: Task) { }
}

// 引擎：任务调度中心
export class Engine {

    async init() {
        Logger.trace('Workflow Engine Starting');

        await mq.Channel.assertQueue(MQChannel.WF);
        await this.start();

        Logger.trace('Workflow Engine Started');
    }

    async dispatch(task: Task) {

        Logger.log('WF dispatch --->', task);

        return await mq.Channel.sendToQueue(MQChannel.WF, new Buffer(JSON.stringify(task)));
    }

    private async start() {

        await mq.Channel.consume(MQChannel.WF, async msg => {

            const task = JSON.parse(msg.content.toString()) as Task;

            Logger.log('WF consume --->', task);

            await mq.Channel.ack(msg);
        });
    }
}

const wf = new Engine();

export { wf };
export default wf;