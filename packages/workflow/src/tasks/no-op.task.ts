import * as UUID from 'uuid';
import { TaskResult } from '../core/task-result';
import { TaskStatus } from '../workflow.enums';
import { ITask } from '../workflow.interfaces';

export class NoOpTask implements ITask {
    private readonly _name: string = UUID.v4();

    constructor(name?: string) {
        if (!!name) {
            this._name = name;
        }
    }

    public get Name() {
        return this._name;
    }

    public async call() {
        return new TaskResult(TaskStatus.COMPLETED);
    }
}
