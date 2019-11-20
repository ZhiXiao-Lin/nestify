import * as UUID from 'uuid';
import { TaskStatus } from "../workflow.enums";
import { ITask, ITaskResult } from "../workflow.interfaces";
import { AbstractWorkFlow } from "./abstract-workflow";

export class SequentialFlowBuilder {
    private _name: string = UUID.v4();
    private _tasks: ITask[] = [];

    public static newFlow(): SequentialFlowBuilder {
        return new SequentialFlowBuilder();
    }

    public name(name: string) {
        this._name = name;
        return this;
    }

    public execute(task: ITask) {
        this._tasks.push(task);
        return this;
    }

    public then(task: ITask) {
        this._tasks.push(task);
        return this;
    }

    public build(): SequentialFlow {
        return new SequentialFlow(this._name, this._tasks);
    }
}

export class SequentialFlow extends AbstractWorkFlow {
    private tasks: ITask[] = [];

    constructor(name: string, tasks: ITask[]) {
        super(name);
        this.tasks = this.tasks.concat(tasks);
    }

    public async call() {
        let taskResult: ITaskResult = null;

        for (let task of this.tasks) {
            taskResult = await task.call();
            if (!!taskResult && TaskStatus.FAILED === taskResult.getStatus()) {
                break;
            }
        }

        return taskResult;
    }
}