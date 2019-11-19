import { IRule } from '../interfaces';
import { RULE_CONSTANTS } from '../rule-engine.constants';
import { IAction, ICondition } from '../types';
import { DefaultRule } from './rule';

export class RuleBuilder {
    private _name: string = RULE_CONSTANTS.NAME;
    private _description: string = RULE_CONSTANTS.DESCRIPTION;
    private _priority: number = RULE_CONSTANTS.PRIORITY;

    private _condition: ICondition;
    private _actions: IAction[] = [];

    public name(name: string) {
        this._name = name;
        return this;
    }

    public description(description: string) {
        this._description = description;
        return this;
    }

    public priority(priority: number) {
        this._priority = priority;
        return this;
    }

    public when(condition: ICondition) {
        this._condition = condition;
        return this;
    }

    public then(action: IAction) {
        this._actions.push(action);
        return this;
    }

    public build(): IRule {
        return new DefaultRule(this._condition, this._actions, this._name, this._description, this._priority);
    }
}
