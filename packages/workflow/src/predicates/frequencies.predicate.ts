import { TaskPredicate } from '../core';
import { ITaskResult } from '../workflow.interfaces';

export class FrequenciesPredicate extends TaskPredicate {
    private readonly _total: number;
    private _counter: number = 0;

    constructor(total: number) {
        super();
        this._total = total;
    }

    public async apply(result: ITaskResult): Promise<boolean> {
        return this._total > this._counter++;
    }
}
