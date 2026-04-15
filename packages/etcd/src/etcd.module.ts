import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { EtcdModuleOptions } from './etcd.types';
import { EtcdService } from './etcd.service';
import { EtcdConfigService } from './config.service';

@Global()
@Module({
    providers: [EtcdService, EtcdConfigService],
    exports: [EtcdService, EtcdConfigService],
})
export class EtcdModule {
    static register(options: EtcdModuleOptions): DynamicModule {
        return {
            module: EtcdModule,
            providers: [
                {
                    provide: EtcdModuleOptions,
                    useValue: options,
                },
            ],
            exports: [EtcdService, EtcdConfigService],
        };
    }

    static registerAsync(options: {
        useFactory?: () => Promise<EtcdModuleOptions> | EtcdModuleOptions;
        inject?: any[];
    }): DynamicModule {
        const asyncProviders: Provider[] = [];

        if (options.useFactory) {
            asyncProviders.push({
                provide: EtcdModuleOptions,
                useFactory: options.useFactory,
                inject: options.inject ?? [],
            });
        }

        return {
            module: EtcdModule,
            imports: [],
            providers: asyncProviders,
            exports: [EtcdService, EtcdConfigService],
        };
    }
}
