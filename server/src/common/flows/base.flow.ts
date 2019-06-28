import * as _ from 'lodash';
import { FlowTemplateEnum } from '../aspects/enum';
import { Logger } from '../lib/logger';
import { FlowTemplate } from '../entities/flow-template.entity';
import { OnModuleInit } from '@nestjs/common';
import { Engine } from '../lib/wf';
import { Repository } from 'typeorm';

export abstract class BaseFlow implements OnModuleInit {
    flow: any;

    constructor(
        protected readonly name: string,
        protected readonly template: FlowTemplateEnum,
        protected readonly flowTemplateRepository: Repository<FlowTemplate>
    ) {}

    async onModuleInit() {
        await this.register();
    }

    async register() {
        Engine.register(FlowTemplateEnum.APPLY_VR, this.flow);

        let target = await this.flowTemplateRepository.findOne({
            where: { template: this.template }
        });

        if (!target) {
            target = new FlowTemplate();

            const flowSteps = Object.keys(this.flow).map((item) => {
                return {
                    name: item,
                    steps: Object.keys(this.flow[item]).map((action) => ({ name: action }))
                };
            });

            target.ex_info = { flowSteps };
        }

        target.name = this.name;
        target.template = this.template;

        Logger.log(`Register flow ${this.template}`);

        await this.flowTemplateRepository.save(target);
    }
}
