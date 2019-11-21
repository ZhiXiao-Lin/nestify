import { Injectable, Logger } from '@nestjs/common';
import { WorkFlowEngine } from './core';
import { InjectWorkFlowModuleOptions } from './workflow.decorators';
import { ITaskResult, IWorkFlow, WorkFlowModuleOptions } from './workflow.interfaces';

@Injectable()
export class WorkFlowService {
    private readonly engine: WorkFlowEngine;

    constructor(
        @InjectWorkFlowModuleOptions()
        private readonly options: WorkFlowModuleOptions
    ) {
        if (!this.options.logger) {
            this.options.logger = new Logger('WorkFlow');
        }

        this.engine = new WorkFlowEngine(this.options.eventPrefix, this.options.event, this.options.logger);
    }

    async run(workflow: IWorkFlow): Promise<ITaskResult> {
        return this.engine.run(workflow);
    }
}
