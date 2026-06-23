import {
    Global,
    Module,
    type DynamicModule,
    type FactoryProvider,
    type ModuleMetadata,
    type Provider,
} from '@nestjs/common';
import { ETCD_MODULE_OPTIONS, type EtcdModuleOptions } from './etcd.types';
import { EtcdService } from './etcd.service';
import { EtcdConfigService } from './config.service';

@Global()
@Module({})
export class EtcdModule {
    static register(options: EtcdModuleOptions): DynamicModule {
        return {
            module: EtcdModule,
            providers: [
                {
                    provide: ETCD_MODULE_OPTIONS,
                    useValue: options,
                },
                EtcdService,
                EtcdConfigService,
            ],
            exports: [EtcdService, EtcdConfigService],
        };
    }

    static registerAsync(options: {
        imports?: ModuleMetadata['imports'];
        useFactory?: (...args: unknown[]) => Promise<EtcdModuleOptions> | EtcdModuleOptions;
        inject?: FactoryProvider['inject'];
    }): DynamicModule {
        const asyncProviders: Provider[] = [];

        if (options.useFactory) {
            asyncProviders.push({
                provide: ETCD_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject ?? [],
            });
        }

        return {
            module: EtcdModule,
            imports: options.imports,
            providers: [...asyncProviders, EtcdService, EtcdConfigService],
            exports: [EtcdService, EtcdConfigService],
        };
    }
}
