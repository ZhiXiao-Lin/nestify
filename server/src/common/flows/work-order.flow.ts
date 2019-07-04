import { Repository, Transaction, TransactionRepository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Logger } from '../lib/logger';
import { BaseFlow } from './base.flow';
import { FlowTemplateEnum, FlowOperationsEnum } from '../aspects/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { FlowTemplate } from '../entities/flow-template.entity';
import { User } from '../entities/user.entity';
import { Flow } from '../entities/flow.entity';
import { WFResult, WFStatus, OVER } from '../lib/wf';
import { Service } from '../entities/service.entity';
import { Detail } from '../entities/detail.entity';

@Injectable()
export class WorkOrderFlow extends BaseFlow {
    protected readonly name: string = '服务工单';
    protected readonly template: FlowTemplateEnum = FlowTemplateEnum.WORK_OR;
    protected readonly operations: any = {
        待派单: {
            派单: FlowOperationsEnum.ALLOCATION,
            作废: FlowOperationsEnum.REMARKS
        },
        已拒绝: {
            重新派单: FlowOperationsEnum.ALLOCATION,
            作废: FlowOperationsEnum.REMARKS
        },
        待接单: {
            拒绝: FlowOperationsEnum.REMARKS
        },
        待结单: {
            作废: FlowOperationsEnum.REMARKS
        }
    };
    protected readonly flow: any = {
        待申请: {
            申请: this.apply
        },
        待派单: {
            派单: this.allocation,
            作废: this.cancel
        },
        已拒绝: {
            重新派单: this.allocation,
            作废: this.cancel
        },
        待接单: {
            接单: this.receipt,
            拒绝: this.refuse
        },
        待执行: {
            完成: this.complete
        },
        待结单: {
            结单: this.statement,
            作废: this.cancel
        },
        已结单: {

        },
        已作废: {

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
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '待派单';

        flow = Flow.create(flow) as Flow;
        flow.wfResult = WFResult.RUNNING;
        flow.wfStatus = WFStatus.RUNNING;
        flow.state = nextState;

        await flowRepos.save(flow);
        return nextState;
    }


    @Transaction()
    async allocation(
        flow,
        options,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '待接单';

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;
        flow.executor = User.create(options.executor) as User;

        await flowRepos.save(flow);
        return nextState;
    }


    @Transaction()
    async refuse(
        flow,
        options,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '已拒绝';

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;
        flow.executor = null;

        await flowRepos.save(flow);
        return nextState;
    }

    @Transaction()
    async receipt(
        flow,
        options,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '待执行';

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return nextState;
    }

    @Transaction()
    async complete(
        flow,
        options,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {
        const nextState = '待结单';

        flow = Flow.create(flow) as Flow;
        flow.state = nextState;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);
        return nextState;
    }

    @Transaction()
    async statement(
        flow,
        options,
        @TransactionRepository(Service) serviceRepos?: Repository<Service>,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Detail) detailRepos?: Repository<Detail>,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {

        flow = await flowRepos.findOne({ where: { id: flow.id }, relations: ['user', 'operator', 'executor'] })
        flow.state = '已结单';
        flow.wfResult = WFResult.SUCCESS;
        flow.wfStatus = WFStatus.OVER;
        flow.operator = User.create(options.operator) as User;

        await flowRepos.save(flow);

        const service = await serviceRepos.findOne(flow.target);

        // 给用户增加积分
        const user = await userRepos.findOne(flow.executor.id);
        user.points += service.points;
        await userRepos.save(user);

        // 增加积分明细
        const detail = new Detail();
        detail.title = '完成任务加积分';
        detail.value = service.points;
        detail.user = user;
        await detailRepos.save(detail);

        return OVER;
    }

    @Transaction()
    async cancel(
        flow,
        options,
        @TransactionRepository(Flow) flowRepos?: Repository<Flow>
    ) {

        flow = Flow.create(flow) as Flow;
        flow.state = '已作废';
        flow.wfResult = WFResult.FAILURE;
        flow.wfStatus = WFStatus.CANCELED;
        flow.operator = User.create(options.operator) as User;

        if (!!options.remarks) {
            const remarks = flow.ex_info.remarks || [];
            remarks.push(options.remarks);
            flow.ex_info.remarks = remarks;
        }

        await flowRepos.save(flow);
        return OVER;
    }

}
