import { Logger, LoggerService } from '@nestjs/common';
import { ITaskResult, IWorkFlow } from '../workflow.interfaces';

export abstract class AbstractWorkFlow implements IWorkFlow {
    constructor(private readonly name: string, protected logger?: LoggerService) {
        if (!logger) {
            this.logger = new Logger('WorkFlow');
        }
    }

    public get Name(): string {
        return this.name;
    }

    public async call(): Promise<ITaskResult> {
        return null;
    }
}
