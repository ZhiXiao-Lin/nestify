import { Base } from './base';
import { Entity, Column, ManyToOne } from 'typeorm';
import { IFlow, WFStatus, WFResult } from '../lib/wf';
import { FlowTemplate } from './flow-template.entity';
import { plainToClass, Expose } from 'class-transformer';
import { User } from './user.entity';

@Entity()
export class Flow extends Base implements IFlow {
    @Column({
        comment: '任务状态'
    })
    state: string;

    @Column({
        comment: '流程状态'
    })
    wfStatus: WFStatus;

    @Column({
        comment: '流程结果'
    })
    wfResult: WFResult;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => FlowTemplate, (template) => template.flows)
    template: FlowTemplate;

    @ManyToOne((type) => User, (user) => user.flows)
    user: User;

    @ManyToOne((type) => User, (operator) => operator.operatorFlows)
    operator: User;

    static create(target: Object) {
        return plainToClass(Flow, target);
    }

    // 当前任务状态
    get State() {
        return this.state;
    }

    // 当前状态可执行任务
    @Expose()
    get ExecutableTasks() {
        if (!!this.template) {
            const { flowSteps } = this.template.ex_info;

            if (!!flowSteps) {
                const flow = flowSteps.find((item) => item.name === this.state);
                if (!!flow) {
                    return flow.steps.map((item) => item.name);
                }
            }
        }

        return [];
    }
}
