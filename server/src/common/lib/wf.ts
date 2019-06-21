import { Logger } from './logger';
import { mq, MQChannel } from './mq';

export interface IFlow {
    id: string;
    State: string;
    ExecutableTasks: string[];
    execute(name, options);
}

export class Engine {

    flows: IFlow[] = [];

    async init() {
        Logger.trace('Workflow Engine Starting');

        await mq.Channel.assertQueue(MQChannel.WF);
        await this.start();

        Logger.trace('Workflow Engine Started');
    }

    getFlows() {
        return this.flows.map(item => item.id);
    }

    add(flow: IFlow) {
        if (this.flows.findIndex(item => item.id === flow.id) < 0) {
            Logger.log(`Flow:${flow.id} add ---> ${flow.id}`);
            this.flows.push(flow);
        }
    }

    over(flow: IFlow) {
        Logger.log(`Flow:${flow.id} over`);
        this.flows = this.flows.filter(item => item.id !== flow.id);
    }

    async dispatch(id, taskName, options = {}) {
        Logger.log('WF dispatch --->', id, taskName, options);
        return await mq.Channel.sendToQueue(MQChannel.WF, Buffer.from(JSON.stringify({ id, name: taskName, options })));
    }

    private async start() {

        await mq.Channel.consume(MQChannel.WF, async msg => {

            const task = JSON.parse(msg.content.toString());

            const flow = this.flows.find(item => item.id === task.id);

            if (!!flow) {
                Logger.log(`Flow:${flow.id} current state --->`, flow.State);
                Logger.log(`Flow:${flow.id} executable tasks --->`, flow.ExecutableTasks);

                if (flow.ExecutableTasks.includes(task.name)) {
                    await flow.execute(task.name, task.options);
                }
            }

            await mq.Channel.ack(msg);
        });
    }
}

const wf = new Engine();

export { wf };
export default wf;