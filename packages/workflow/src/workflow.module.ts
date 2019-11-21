import { DynamicModule, Module } from '@nestjs/common';
import { WORK_FLOW_OPTIONS } from './workflow.constants';
import { WorkFlowModuleAsyncOptions, WorkFlowModuleOptions } from './workflow.interfaces';
import { WorkFlowService } from './workflow.service';

@Module({
    providers: [WorkFlowService],
    exports: [WorkFlowService]
})
export class WorkFlowModule {
    public static register(options: WorkFlowModuleOptions): DynamicModule {
        const providers = [
            {
                provide: WORK_FLOW_OPTIONS,
                useValue: options
            }
        ];

        return {
            module: WorkFlowModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: WorkFlowModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: WORK_FLOW_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: WorkFlowModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}
