import { IRule } from '../interfaces';
import { RULE_CONSTANTS } from '../rule-engine.constants';
import { Action, Condition } from '../types';
import { Rule } from './rule';

export class RuleBuilder {
    private _name: string = RULE_CONSTANTS.NAME;
    private _description: string = RULE_CONSTANTS.DESCRIPTION;
    private _priority: number = RULE_CONSTANTS.PRIORITY;

    private _condition: Condition;
    private _actions: Action[] = [];

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

    public when(condition: Condition) {
        this._condition = condition;
        return this;
    }

    public then(action: Action) {
        this._actions.push(action);
        return this;
    }

    public build(): IRule {
        return new Rule(this._condition, this._actions, this._name, this._description, this._priority);
    }
}
