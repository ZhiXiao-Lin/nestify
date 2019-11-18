import { Fact } from '../types';

export interface IRule {
    _name: string;
    _description: string;
    _priority: number;

    evaluate(facts: Fact): Promise<boolean>;
    execute(facts: Fact): Promise<void>;
}
