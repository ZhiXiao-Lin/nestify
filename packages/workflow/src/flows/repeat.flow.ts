import * as UUID from 'uuid';
import { AbstractWorkFlow, TaskPredicate } from '../core';
import { FrequenciesPredicate } from '../predicates';
import { NoOpTask } from '../tasks';
import { ITask, ITaskPredicate, ITaskResult } from '../workflow.interfaces';

export class RepeatFlowBuilder {
    private _name: string = UUID.v4();
    private _task: ITask = new NoOpTask();
    private _predicate: ITaskPredicate = TaskPredicate.ALWAYS_FALSE;

    public static newFlow(): RepeatFlowBuilder {
        return new RepeatFlowBuilder();
    }

    public name(name: string) {
        this._name = name;
        return this;
    }

    public repeat(task: ITask) {
        this._task = task;
        return this;
    }

    public frequencies(total: number) {
        return this.until(new FrequenciesPredicate(total));
    }

    public until(predicate: ITaskPredicate) {
        this._predicate = predicate;
        return this;
    }

    public build(): RepeatFlow {
        return new RepeatFlow(this._name, this._task, this._predicate);
    }
}

export class RepeatFlow extends AbstractWorkFlow {
    private readonly _task: ITask;
    private readonly _predicate: ITaskPredicate;

    constructor(name: string, task: ITask, predicate: ITaskPredicate) {
        super(name);
        this._task = task;
        this._predicate = predicate;
    }

    public async call(): Promise<ITaskResult> {
        this.logger.debug(`${RepeatFlow.name} ${this.Name} is running`);

        let taskResult: ITaskResult;

        do {
            taskResult = await this._task.call();
        } while (await this._predicate.apply(taskResult));

        return taskResult;
    }
}
