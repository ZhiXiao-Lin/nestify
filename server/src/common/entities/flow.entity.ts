import { Base } from './base';
import { Entity, Column, AfterInsert, BeforeRemove } from 'typeorm';
import { wf, IFlow } from '../lib/wf';
import { FlowTemplate } from '../aspects/enum';

@Entity()
export class Flow extends Base implements IFlow {

    @Column({
        comment: '流程名称'
    })
    name: string;

    @Column({
        comment: '当前状态'
    })
    state: string;

    @Column({
        comment: '任务模板'
    })
    template: FlowTemplate;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    tasks: any;

    async execute(task, options = {}) {
        const nextState = await this.tasks[this.state][task](options);
        this.state = nextState;

        return this.state;
    }

    get State() {
        return this.state;
    }

    get ExecutableTasks() {
        return Object.keys(this.tasks[this.state]);
    }

    @AfterInsert()
    async afterInsert() {
        await wf.add(this);
    }

    @BeforeRemove()
    async beforeRemove() {
        await wf.over(this);
    }
}
