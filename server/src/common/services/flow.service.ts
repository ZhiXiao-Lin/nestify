import * as _ from 'lodash';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Flow } from '../entities/flow.entity';
import { wf } from '../lib/wf';
import { FlowTemplate } from '../aspects/enum';
import { WorkOrderFlow } from '../flows/work-order.flow';

@Injectable()
export class FlowService extends BaseService<Flow> implements OnModuleInit {
    flowTemplates: any = {};

    constructor(
        private readonly workOrderFlow: WorkOrderFlow,
        @InjectRepository(Flow) private readonly flowRepository: Repository<Flow>
    ) {
        super(flowRepository);
    }

    async onModuleInit() {
        // 注册流程模板
        this.registerFlowTemplate(FlowTemplate.WORK_ORDER, this.workOrderFlow.Flow);

        // 加载数据库中所有的工作流任务
        const flows = await this.flowRepository.find();

        flows.forEach((item) => {
            item.tasks = this.flowTemplates[item.template];
            wf.add(item);
        });
    }

    registerFlowTemplate(flowTemplate: FlowTemplate, flow: any) {
        this.flowTemplates[flowTemplate] = flow;
    }

    async createFlow(name: string, flowTemplate: FlowTemplate, initState?: string) {
        const flow = new Flow();
        flow.name = name;
        flow.template = flowTemplate;
        flow.tasks = this.flowTemplates[flowTemplate];
        flow.state = initState || Object.keys(flow.tasks)[0];

        return await this.flowRepository.save(flow);
    }
}
