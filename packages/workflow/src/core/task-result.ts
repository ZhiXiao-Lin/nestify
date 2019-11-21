import { ITaskResult } from '../workflow.interfaces';
import { TaskStatus } from '../workflow.enums';

export class TaskResult implements ITaskResult {
    private status: TaskStatus;

    constructor(status: TaskStatus) {
        this.status = status;
    }

    public getStatus(): TaskStatus {
        return this.status;
    }
}
