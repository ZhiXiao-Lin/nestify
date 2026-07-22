import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import {
    ASYNC_OPTIONS_TYPE,
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE,
} from './kysely.module-definition';
import { KyselyService } from './kysely.service';
import { type KyselyModuleOptions, normalizeKyselyModuleOptions } from './kysely-module-options.interface';

const kyselyServiceProvider: Provider = {
    provide: KyselyService,
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: (options: KyselyModuleOptions) => {
        const normalized = normalizeKyselyModuleOptions(options);
        return normalized.instance ?? new KyselyService(normalized);
    },
};

@Module({})
export class KyselyModule extends ConfigurableModuleClass {
    static register(options: typeof OPTIONS_TYPE): DynamicModule {
        const normalized = normalizeKyselyModuleOptions(options);
        const dynamicModule = super.register({
            ...normalized,
            isGlobal: options.isGlobal ?? true,
        });
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), kyselyServiceProvider],
            exports: [KyselyService],
        };
    }

    static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
        const dynamicModule = super.registerAsync(options);
        return {
            ...dynamicModule,
            providers: [...(dynamicModule.providers || []), kyselyServiceProvider],
            exports: [KyselyService],
        };
    }
}
