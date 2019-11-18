import { IRule } from '../interfaces';
import { RULE_CONSTANTS } from '../rule-engine.constants';
import { Action, Condition, Fact } from '../types';

export class Rule implements IRule {
    public readonly _name: string;
    public readonly _description: string;
    public readonly _priority: number;

    private readonly _condition: Condition;
    private readonly _actions: Action[];

    constructor(condition: Condition, actions: Action[], name?: string, description?: string, priority?: number) {
        this._name = name ? name : RULE_CONSTANTS.NAME;
        this._description = description ? description : RULE_CONSTANTS.DESCRIPTION;
        this._priority = priority ? priority : RULE_CONSTANTS.PRIORITY;

        this._condition = condition;
        this._actions = actions;
    }

    public async evaluate(facts: Fact): Promise<boolean> {
        return await this._condition(facts);
    }

    public async execute(facts: Fact) {
        for (let action of this._actions) {
            await action(facts);
        }
    }
}
