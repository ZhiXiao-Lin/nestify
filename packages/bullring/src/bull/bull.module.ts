import { DynamicModule, Module } from "@nestjs/common";
import { BULL_OPTIONS } from "./bull.constants";
import { BullModuleAsyncOptions, BullModuleOptions } from "./bull.interfaces";
import { BullService } from "./bull.service";

@Module({
    providers: [BullService],
    exports: [BullService]
})
export class BullModule {
    public static register(options: BullModuleOptions): DynamicModule {
        const providers = [
            {
                provide: BULL_OPTIONS,
                useValue: options || {}
            }
        ];

        return {
            module: BullModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: BullModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: BULL_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: BullModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}