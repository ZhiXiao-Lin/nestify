import { ITaskResult, IWorkFlow } from '../workflow.interfaces';

export abstract class AbstractWorkFlow implements IWorkFlow {
    constructor(private readonly name: string) { }

    public getName(): string {
        return this.name;
    }

    public async call(): Promise<ITaskResult> {
        return null;
    }
}