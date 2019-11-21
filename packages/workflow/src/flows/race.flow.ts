import * as UUID from 'uuid';
import { AbstractWorkFlow } from '../core';
import { ITask, ITaskResult } from '../workflow.interfaces';

export class RaceFlowBuilder {
    private _name: string = UUID.v4();
    private _tasks: ITask[] = [];

    public static newFlow(): RaceFlowBuilder {
        return new RaceFlowBuilder();
    }

    public name(name: string) {
        this._name = name;
        return this;
    }

    public execute(...tasks: ITask[]) {
        this._tasks = this._tasks.concat(tasks);
        return this;
    }

    public build(): RaceFlow {
        return new RaceFlow(this._name, this._tasks);
    }
}

export class RaceFlow extends AbstractWorkFlow {
    private readonly _tasks: ITask[] = [];

    constructor(name: string, tasks: ITask[]) {
        super(name);
        this._tasks = this._tasks.concat(tasks);
    }

    public async call(): Promise<ITaskResult> {
        this.logger.debug(`${RaceFlow.name} ${this.Name} is running`);

        return await Promise.race(this._tasks.map((task) => task.call()));
    }
}
