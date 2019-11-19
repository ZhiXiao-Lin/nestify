import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { DefaultRule, RuleEngine } from './core';
import { IRule } from './interfaces';
import { RULE_CONSTANTS, RULE_ENGINE_ACTION, RULE_ENGINE_CONDITION, RULE_ENGINE_RULE } from './rule-engine.constants';
import { InjectRuleEngineModuleOptions } from './rule-engine.decorators';
import { RuleEngineModuleOptions } from './rule-engine.interfaces';
import { IAction, ICondition, Fact } from './types';

@Injectable()
export class RuleEngineService {
    private readonly engine: RuleEngine;

    constructor(
        @InjectRuleEngineModuleOptions()
        private readonly options: RuleEngineModuleOptions,
        private readonly reflector: Reflector
    ) {
        if (!this.options.logger) {
            this.options.logger = new Logger('RuleEngine');
        }

        this.engine = new RuleEngine(this.options.eventPrefix || 'rule-engine', this.options.event, this.options.logger);
    }

    public register(obj: any): IRule {
        const ruleInfo = this.reflector.get(RULE_ENGINE_RULE, obj) || {};

        let condition: ICondition;
        let actions: IAction[] = [];

        const instance = new obj();

        new MetadataScanner().scanFromPrototype(instance, Object.getPrototypeOf(instance), (key: string) => {
            if (!!this.reflector.get(RULE_ENGINE_CONDITION, instance[key])) {
                condition = instance[key].bind(instance);
            }
            if (!!this.reflector.get(RULE_ENGINE_ACTION, instance[key])) {
                actions.push(instance[key].bind(instance));
            }
        });

        return new DefaultRule(
            condition,
            actions,
            ruleInfo.name || RULE_CONSTANTS.NAME,
            ruleInfo.description || RULE_CONSTANTS.DESCRIPTION,
            ruleInfo.priority || RULE_CONSTANTS.PRIORITY
        );
    }

    public async fire(rules: IRule[], facts: Fact) {
        return await this.engine.fire(rules, facts);
    }
}
