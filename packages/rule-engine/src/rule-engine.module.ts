import { DynamicModule, Module } from '@nestjs/common';
import { RULE_ENGINE_OPTIONS } from './rule-engine.constants';
import { RuleEngineModuleAsyncOptions, RuleEngineModuleOptions } from './rule-engine.interfaces';
import { RuleEngineService } from './rule-engine.service';

@Module({
    providers: [RuleEngineService],
    exports: [RuleEngineService]
})
export class RuleEngineModule {
    public static register(options: RuleEngineModuleOptions): DynamicModule {
        const providers = [
            {
                provide: RULE_ENGINE_OPTIONS,
                useValue: options
            }
        ];

        return {
            module: RuleEngineModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: RuleEngineModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: RULE_ENGINE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: RuleEngineModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}
