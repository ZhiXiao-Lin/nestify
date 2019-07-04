import { Injectable } from '@nestjs/common';
import { Transaction, TransactionRepository, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FlowTemplateEnum } from '../aspects/enum';
import { Flow } from '../entities/flow.entity';
import { FlowTemplate } from '../entities/flow-template.entity';
import { BaseFlow } from './base.flow';
import { InjectRepository } from '@nestjs/typeorm';
import { OVER, WFResult, WFStatus } from '../lib/wf';
import { Role } from '../entities/role.entity';

@Injectable()
export class ApplyVolunteerFlow extends BaseFlow {
    protected readonly name: string = '志愿者申请';
    protected readonly template: FlowTemplateEnum = FlowTemplateEnum.APPLY_VR;
    protected readonly flowSteps: any = [
        {
            name: '未审核',
            steps: [{ name: '申请', nextState: '待审核', task: this.apply, roles: ['self'] }]
        },
        {
            name: '待审核',
            steps: [
                { name: '审核', nextState: '已审核', task: this.verify, roles: ['admin'] },
                { name: '驳回', nextState: '已驳回', task: this.reject, roles: ['admin'] }
            ],
        },
        {
            name: '已驳回',
            steps: [
                { name: '重新申请', nextState: '待审核', task: this.apply, roles: ['self'] },
                { name: '取消', nextState: OVER, task: this.cancel, roles: ['self'] }
            ]
        },
        {
            name: '已审核',
            steps: [{ name: '完成', nextState: OVER, task: this.complete }]
        }
    ];

    constructor(
        @InjectRepository(FlowTemplate)
        protected readonly flowTemplateRepository: Repository<FlowTemplate>
    ) {
        super(flowTemplateRepository);
    }

    @Transaction()
    async apply(
        step,
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {

        const user = flow.user;
        user.status = step.nextState;
        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.wfResult = WFResult.RUNNING;
        flow.wfStatus = WFStatus.RUNNING;
        flow.state = step.nextState;

        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
    }

    @Transaction()
    async verify(
        step,
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Role) roleRepos?: Repository<Role>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {

        const role = await roleRepos.findOne({ where: { token: 'volunteer' } });

        const user = await userRepos.findOne({ where: { id: flow.user.id }, relations: ['role'] });
        user.status = step.nextState;
        user.role = role;

        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = step.nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return { name: '完成' };
    }

    @Transaction()
    async reject(
        step,
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {

        const user = flow.user;
        user.status = step.nextState;

        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = step.nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
    }

    @Transaction()
    async complete(step, flow, options, @TransactionRepository(Flow) flowRepos?: Repository<Flow>) {

        await flowRepos.delete(flow.id);
    }

    @Transaction()
    async cancel(
        step,
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const user = flow.user;
        user.status = '';
        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = step.nextState;
        flow.wfResult = WFResult.FAILURE;
        flow.wfStatus = WFStatus.CANCELED;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);

        return { name: '完成' };
    }
}
