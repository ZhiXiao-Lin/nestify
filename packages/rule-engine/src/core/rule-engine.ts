import { LoggerService } from '@nestjs/common';
import { EventEmitter } from 'events';
import { IRule } from '../interfaces';
import { Fact } from '../types';
import { inspect } from 'util';

export class RuleEngine {
    constructor(private readonly eventPrefix: string, private readonly event: EventEmitter, private readonly logger: LoggerService) {}

    public async fire(rules: IRule[], facts: Fact) {
        rules = [...new Set(rules)];

        if (rules.length <= 0) {
            this.logger.warn('No rules');
            return;
        }

        const ruleList = [...rules].sort((a, b) => a._priority - b._priority);

        this.logRules(ruleList);

        this.logger.debug(`Known facts: ${inspect(facts)}`);

        this.logger.debug('Rules evaluation started');
        this.event.emit(`${this.eventPrefix}:before`, ruleList, facts);

        try {
            for (let rule of ruleList) {
                this.event.emit(`${this.eventPrefix}:${rule._name}:beforeEvaluate`, rule, facts);

                const evaluationResult = await rule.evaluate(facts);
                if (evaluationResult) {
                    this.logger.debug(`Rule '${rule._name}' triggered`);
                    try {
                        this.event.emit(`${this.eventPrefix}:${rule._name}:beforeExecute`, rule, facts);

                        await rule.execute(facts);

                        this.logger.debug(`Rule '${rule._name}' performed successfully`);

                        this.event.emit(`${this.eventPrefix}:${rule._name}:onSuccess`, rule, facts);
                    } catch (err) {
                        this.logger.error(`Rule '${rule._name}' performed with error`, err);
                        this.event.emit(`${this.eventPrefix}:${rule._name}:onFailure`, rule, facts, err);
                    }
                } else {
                    this.logger.debug(`Rule '${rule._name}' has been evaluated to false, it has not been executed`);
                    this.event.emit(`${this.eventPrefix}:${rule._name}:afterEvaluate`, rule, facts, evaluationResult);
                }
            }
        } finally {
            this.event.emit(`${this.eventPrefix}:after`, ruleList, facts);
        }
    }

    private logRules(rules: IRule[]) {
        this.logger.debug('Registered rules:');
        for (let rule of rules) {
            this.logger.debug(inspect(rule));
        }
    }
}
