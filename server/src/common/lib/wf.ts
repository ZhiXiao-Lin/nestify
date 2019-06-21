import { Logger } from './logger';
import { mq, MQChannel } from './mq';

export class Flow {
    readonly id: string;
    readonly tasks: any;

    private state: string;

    constructor(id, tasks, initState?) {
        this.id = id;
        this.tasks = tasks;
        this.state = initState ? initState : Object.keys(tasks)[0];
    }

    async execute(task, options = {}) {

        const nextState = await this.tasks[this.state][task](options);
        this.state = nextState;

        return this.state;
    }

    get CurrentState() {
        return this.state;
    }

    get Tasks() {
        return this.tasks;
    }

    get ExecutableTasks() {
        return Object.keys(this.tasks[this.state]);
    }
}

export class Engine {

    flows: Flow[] = [];

    async init() {
        Logger.trace('Workflow Engine Starting');

        await mq.Channel.assertQueue(MQChannel.WF);
        await this.start();

        Logger.trace('Workflow Engine Started');
    }

    add(flow: Flow) {
        Logger.log(`Flow:${flow.id} add ---> ${flow.id}`);
        this.flows.push(flow);
    }

    over(flowId: string) {
        Logger.log(`Flow:${flowId} over`);
        this.flows = this.flows.filter(item => item.id !== flowId);
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
                Logger.log(`Flow:${flow.id} current state --->`, flow.CurrentState);
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