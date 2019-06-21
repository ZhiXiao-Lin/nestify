import * as _ from 'lodash';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Flow } from '../entities/flow.entity';
import { Logger } from '../lib/logger';
import { wf } from '../lib/wf';
import { FlowTemplate } from '../aspects/enum';


@Injectable()
export class FlowService extends BaseService<Flow> implements OnModuleInit {

    flowTemplates = {};

    constructor(@InjectRepository(Flow) private readonly flowRepository: Repository<Flow>) {
        super(flowRepository);

        this.flowTemplates = {
            workOrder: {
                '待制单': {
                    制单: async () => {
                        Logger.log('已制单');
                        return '待派单';
                    }
                },
                '待派单': {
                    派单: async () => {
                        Logger.log('已派单');
                        return '待接单';
                    }
                },
                '待接单': {
                    接单: async () => {
                        Logger.log('已接单');
                        return '待结单';
                    }
                },
                '待结单': {
                    结单: async () => {
                        Logger.log('已结单');
                        return '完成';
                    }
                },
                '完成': {

                }
            }
        }
    }

    async onModuleInit() {
        // 加载数据库中所有的工作流任务
        const flows = await this.flowRepository.find();

        flows.forEach(item => {
            item.tasks = this.flowTemplates[item.template];
            wf.add(item);
        });
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
