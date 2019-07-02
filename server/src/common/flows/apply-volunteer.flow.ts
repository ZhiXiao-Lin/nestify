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

    protected readonly flow: any = {
        未审核: {
            申请: this.apply
        },
        待审核: {
            审核: this.verify,
            驳回: this.reject,
        },
        已驳回: {
            重新申请: this.apply,
            取消: this.cancel
        },
        已审核: {
            完成: this.complete
        }
    };

    constructor(
        @InjectRepository(FlowTemplate)
        protected readonly flowTemplateRepository: Repository<FlowTemplate>
    ) {
        super(flowTemplateRepository);
    }

    @Transaction()
    async apply(
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '待审核';

        const user = flow.user;
        user.status = nextState;
        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.wfResult = WFResult.RUNNING;
        flow.wfStatus = WFStatus.RUNNING;
        flow.state = nextState;

        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return nextState;
    }

    @Transaction()
    async verify(
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Role) roleRepos?: Repository<Role>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '已审核';

        const role = await roleRepos.findOne({ where: { token: 'volunteer' } });

        const user = await userRepos.findOne({ where: { id: flow.user.id }, relations: ['role'] });
        user.status = nextState;
        user.role = role;

        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return [nextState, { nextStep: '完成' }];
    }

    @Transaction()
    async reject(
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '已驳回';
        const user = flow.user;
        user.status = nextState;

        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return nextState;
    }

    @Transaction()
    async complete(flow, options, @TransactionRepository(Flow) flowRepos?: Repository<Flow>) {

        await flowRepos.delete(flow.id);

        return OVER;
    }

    @Transaction()
    async cancel(
        flow,
        options,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const user = flow.user;
        user.status = '';
        await userRepos.save(user);

        flow = Flow.create(flow) as Flow;
        flow.state = '已取消';
        flow.wfResult = WFResult.FAILURE;
        flow.wfStatus = WFStatus.CANCELED;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return [OVER, { nextStep: '完成' }];
    }
}
