import * as UUID from 'uuid';
import { TaskStatus } from "../workflow.enums";
import { ITask, ITaskResult } from "../workflow.interfaces";
import { AbstractWorkFlow } from "./abstract-workflow";
import { TaskResult } from './task-result';

export class ParallelFlowBuilder {
    private _name: string = UUID.v4();
    private _tasks: ITask[] = [];

    public static newFlow(): ParallelFlowBuilder {
        return new ParallelFlowBuilder();
    }

    public name(name: string) {
        this._name = name;
        return this;
    }

    public execute(...tasks: ITask[]) {
        this._tasks = this._tasks.concat(tasks);
        return this;
    }

    public build(): ParallelFlow {
        return new ParallelFlow(this._name, this._tasks);
    }
}

export class ParallelFlow extends AbstractWorkFlow {

    private _tasks: ITask[] = [];

    constructor(name: string, tasks: ITask[]) {
        super(name);
        this._tasks = this._tasks.concat(tasks);
    }

    public async call(): Promise<ITaskResult> {

        const taskResults: ITaskResult[] = await Promise.all(this._tasks.map(task => task.call()));

        return new TaskResult(taskResults.
            every(res => res.getStatus() === TaskStatus.COMPLETED)
            ? TaskStatus.COMPLETED
            : TaskStatus.FAILED
        )
    }
}