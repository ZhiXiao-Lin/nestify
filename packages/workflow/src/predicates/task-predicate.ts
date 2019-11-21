import { TaskStatus } from '../workflow.enums';
import { ITaskPredicate, ITaskResult } from '../workflow.interfaces';

export class TaskPredicate implements ITaskPredicate {
    constructor(private readonly action?: CallableFunction) {
        if (!!action) {
            this.action = action;
        } else {
            this.action = async (result: ITaskResult) => false;
        }
    }

    public async apply(result: ITaskResult): Promise<boolean> {
        return await this.action(result);
    }

    public static ALWAYS_TRUE = new TaskPredicate(async (result: ITaskResult) => true);

    public static ALWAYS_FALSE = new TaskPredicate(async (result: ITaskResult) => false);

    public static COMPLETED = new TaskPredicate(async (result: ITaskResult) => TaskStatus.COMPLETED === result.getStatus());

    public static FAILED = new TaskPredicate(async (result: ITaskResult) => TaskStatus.FAILED === result.getStatus());
}
