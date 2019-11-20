import { TaskStatus } from "../workflow.enums";
import { ITask, ITaskResult } from "../workflow.interfaces";
import { AbstractWorkFlow } from "./abstract-workflow";
import { TaskResult } from './task-result';

export class ParallerFlow extends AbstractWorkFlow {

    private _tasks: ITask[] = [];

    constructor(name: string, tasks: ITask[]) {
        super(name);
        this._tasks = this._tasks.concat(tasks);
    }

    public async call(): Promise<ITaskResult> {

        const taskResults: ITaskResult[] = await Promise.all(this._tasks.map(task => task.call()));

        return taskResults.
            every(res => res.getStatus() === TaskStatus.COMPLETED) ?
            new TaskResult(TaskStatus.COMPLETED) :
            new TaskResult(TaskStatus.FAILED);
    }
}