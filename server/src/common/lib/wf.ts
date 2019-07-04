import { isArray } from 'lodash';
import { Logger } from './logger';
import { mq, MQChannel } from './mq';
import { Flow } from '../entities/flow.entity';
import { FlowTemplateEnum } from '../aspects/enum';
import { getRepository } from 'typeorm';

export const OVER = 'OVER';

export interface IFlow {
    id: string;
    State: string;
    ExecutableTasks: string[];
}

export enum WFStatus {
    RUNNING, // 运行中
    OVER, // 已完成
    CANCELED // 已取消
}

export enum WFResult {
    RUNNING, // 进行中
    SUCCESS, //成功
    FAILURE // 失败
}

export class Engine {
    static flowTemplates: any = {};

    public static register(template: FlowTemplateEnum, flow: any) {
        Engine.flowTemplates[template] = flow;
    }

    public async init() {
        Logger.trace('Workflow Engine Starting');

        await mq.Channel.assertQueue(MQChannel.WF);
        await this.consume();

        Logger.trace('Workflow Engine Started');
    }

    public async dispatch(id, taskName, options = {}) {
        Logger.log(`WF:${id} dispatch`, taskName, options);

        return await mq.Channel.sendToQueue(
            MQChannel.WF,
            Buffer.from(JSON.stringify({ id, name: taskName, options }))
        );
    }

    private async consume() {
        await mq.Channel.consume(MQChannel.WF, async (msg) => {
            const task = JSON.parse(msg.content.toString());

            const flow = await getRepository(Flow).findOne({
                where: { id: task.id },
                relations: ['user', 'template', 'operator']
            });
            Logger.log('WF: flow', flow);

            if (!!flow) {
                Logger.log('WF: current ExecutableTasks', flow.ExecutableTasks);

                if (flow.ExecutableTasks.includes(task.name)) {
                    const template = Engine.flowTemplates[flow.template.template];
                    const currentFlow = template.find(item => item.name === flow.state);
                    const currentStep = currentFlow.steps.find(item => item.name === task.name);
                    const nextStep = await currentStep.task(currentStep, flow, task.options);

                    Logger.log('WF: next state', flow.state);

                    flow.state = currentStep.nextState;

                    if (!!nextStep) {
                        await this.dispatch(
                            nextStep.id || flow.id,
                            nextStep.name,
                            nextStep.options || {}
                        );
                    }

                    Logger.log('WF: next ExecutableTasks', flow.ExecutableTasks);
                }
            }

            await mq.Channel.ack(msg);
        });
    }
}

const wf = new Engine();

export { wf };
export default wf;
