import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { IRule } from '../interfaces';
import { Fact } from '../types';
import { Rule } from './rule';
import { RuleEngine } from './rule-engine';

describe('RuleEngine', () => {
    let re: RuleEngine;
    let event: EventEmitter;
    let facts: Fact;
    let rules: IRule[] = [];

    let actionFlag: boolean;
    let eventFlags = {};

    const ruleName = 'test rule';

    beforeAll(async () => {
        event = new EventEmitter();

        event.on('rule-engine:before', (rules: IRule[], facts: Fact) => {
            eventFlags['before'] = true;
        });

        event.on(`rule-engine:${ruleName}:beforeEvaluate`, (rule: IRule, facts: Fact) => {
            eventFlags[`beforeEvaluate:${ruleName}`] = true;
        });

        event.on(`rule-engine:${ruleName}:beforeExecute`, (rule: IRule, facts: Fact) => {
            eventFlags[`beforeExecute:${rule._name}`] = true;
        });

        event.on(`rule-engine:${ruleName}:onSuccess`, (rule: IRule, facts: Fact) => {
            eventFlags[`onSuccess:${rule._name}`] = true;
        });

        event.on(`rule-engine:${ruleName}:onFailure`, (rule: IRule, facts: Fact, err: Error) => {
            eventFlags[`onFailure:${rule._name}`] = true;
        });

        event.on(`rule-engine:${ruleName}:afterEvaluate`, (rule: IRule, facts: Fact, err: Error) => {
            eventFlags[`afterEvaluate:${rule._name}`] = true;
        });

        event.on(`rule-engine:after`, (rules: IRule[], facts: Fact) => {
            eventFlags['after'] = true;
        });

        const condition = async (facts: Fact) => {
            return 'test' === facts['value'];
        };

        const action = async (facts: Fact) => {
            actionFlag = true;
        };

        re = new RuleEngine('rule-engine', event, new Logger(RuleEngine.name));

        rules.push(new Rule(condition, [action], ruleName, 'A test rule', 1));

        facts = { value: 'test' };

        re.fire(rules, facts);
    });

    it('The actionFlag should be true', () => {
        expect(actionFlag).toEqual(true);
    });

    it('The event of before should be triggered', () => {
        expect(eventFlags['before']).toEqual(true);
    });

    it('The event of after should be triggered', () => {
        expect(eventFlags['after']).toEqual(true);
    });

    it(`The event of beforeEvaluate:${ruleName} rule should be triggered`, () => {
        expect(eventFlags[`beforeEvaluate:${ruleName}`]).toEqual(true);
    });

    it(`The event of beforeExecute:${ruleName} rule should be triggered`, () => {
        expect(eventFlags[`beforeExecute:${ruleName}`]).toEqual(true);
    });

    it(`The event of onSuccess:${ruleName} rule should be triggered`, () => {
        expect(eventFlags[`onSuccess:${ruleName}`]).toEqual(true);
    });

    it(`The event of onFailure:${ruleName} rule should be triggered`, () => {
        expect(eventFlags[`onFailure:${ruleName}`]).toBeUndefined();
    });

    it(`The event of afterEvaluate:${ruleName} rule should be triggered`, () => {
        expect(eventFlags[`afterEvaluate:${ruleName}`]).toBeUndefined();
    });
});
