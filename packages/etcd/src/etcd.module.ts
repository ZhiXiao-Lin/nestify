import { type DynamicModule, type FactoryProvider, Global, Module, type ModuleMetadata } from '@nestjs/common';
import { EtcdConfigService } from './config.service';
import { EtcdService } from './etcd.service';
import { ETCD_MODULE_OPTIONS, type EtcdModuleOptions } from './etcd.types';

export type EtcdModuleAsyncOptions = Pick<ModuleMetadata, 'imports'> &
    Pick<FactoryProvider<EtcdModuleOptions>, 'inject' | 'useFactory'>;

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

    static registerAsync(options: EtcdModuleAsyncOptions): DynamicModule {
        return {
            module: EtcdModule,
            imports: options.imports,
            providers: [
                {
                    provide: ETCD_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject ?? [],
                },
                EtcdService,
                EtcdConfigService,
            ],
            exports: [EtcdService, EtcdConfigService],
        };
    }
}
