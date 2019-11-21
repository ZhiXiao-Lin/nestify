import * as UUID from 'uuid';
import { AbstractWorkFlow, TaskPredicate } from '../core/';
import { NoOpTask } from '../tasks';
import { ITask, ITaskPredicate, ITaskResult } from '../workflow.interfaces';

export class ConditionalFlowBuilder {
    private _name: string = UUID.v4();
    private _task: ITask = new NoOpTask();
    private _onSuccessTask: ITask = new NoOpTask();
    private _onFailureTask: ITask = new NoOpTask();
    private _predicate: ITaskPredicate = TaskPredicate.ALWAYS_FALSE;

    public static newFlow(): ConditionalFlowBuilder {
        return new ConditionalFlowBuilder();
    }

    public name(name: string) {
        this._name = name;
        return this;
    }

    public execute(task: ITask) {
        this._task = task;
        return this;
    }

    public when(predicate: ITaskPredicate) {
        this._predicate = predicate;
        return this;
    }

    public then(task: ITask) {
        this._onSuccessTask = task;
        return this;
    }

    public catch(task: ITask) {
        this._onFailureTask = task;
        return this;
    }

    public build(): ConditionalFlow {
        return new ConditionalFlow(this._name, this._task, this._onSuccessTask, this._onFailureTask, this._predicate);
    }
}

export class ConditionalFlow extends AbstractWorkFlow {
    constructor(
        name: string,
        private readonly _task: ITask,
        private readonly _onSuccessTask: ITask,
        private readonly _onFailureTask: ITask,
        private readonly _predicate: ITaskPredicate
    ) {
        super(name);
    }

    public async call(): Promise<ITaskResult> {
        this.logger.debug(`${ConditionalFlow.name} ${this.Name} is running`);

        let taskResult = await this._task.call();

        const predicateResult = await this._predicate.apply(taskResult);

        if (!!predicateResult) {
            taskResult = await this._onSuccessTask.call();
        } else {
            taskResult = await this._onFailureTask.call();
        }

        return taskResult;
    }
}
