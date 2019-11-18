import { Inject, SetMetadata } from '@nestjs/common';
import { RULE_CONSTANTS, RULE_ENGINE_ACTION, RULE_ENGINE_CONDITION, RULE_ENGINE_OPTIONS, RULE_ENGINE_RULE } from './rule-engine.constants';
import { ActionDecoratorOptions, ConditionDecoratorOptions, RuleDecoratorOptions } from './rule-engine.interfaces';

export const Rule = (
    options: RuleDecoratorOptions = {
        name: RULE_CONSTANTS.NAME,
        description: RULE_CONSTANTS.DESCRIPTION,
        priority: RULE_CONSTANTS.PRIORITY
    }
): ClassDecorator => SetMetadata(RULE_ENGINE_RULE, options);

export const Condition = (options: ConditionDecoratorOptions = {}): MethodDecorator => SetMetadata(RULE_ENGINE_CONDITION, options);

export const Action = (
    options: ActionDecoratorOptions = {
        order: 0
    }
): MethodDecorator => SetMetadata(RULE_ENGINE_ACTION, options);

export const InjectRuleEngineModuleOptions = (): ParameterDecorator => Inject(RULE_ENGINE_OPTIONS);
