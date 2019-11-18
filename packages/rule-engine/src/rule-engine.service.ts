import { Injectable, Logger } from '@nestjs/common';
import { InjectRuleEngineModuleOptions } from './rule-engine.decorators';
import { RuleEngineModuleOptions } from './rule-engine.interfaces';

@Injectable()
export class RuleEngineService {
    constructor(
        @InjectRuleEngineModuleOptions()
        private readonly options: RuleEngineModuleOptions
    ) {
        if (!this.options.logger) {
            this.options.logger = new Logger('RuleEngine');
        }
    }
}
