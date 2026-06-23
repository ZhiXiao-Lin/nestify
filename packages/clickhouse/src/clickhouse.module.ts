import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';
import { CLICKHOUSE_OPTIONS_TOKEN, ClickHouseAsyncOptions, ClickHouseModuleOptions } from './clickhouse.types';

@Global()
@Module({})
export class ClickHouseModule {
    static register(options: ClickHouseModuleOptions): DynamicModule {
        const providers: Provider[] = [{ provide: CLICKHOUSE_OPTIONS_TOKEN, useValue: options }, ClickHouseService];
        return {
            module: ClickHouseModule,
            providers,
            exports: [ClickHouseService],
        };
    }

    static registerAsync(options: ClickHouseAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: CLICKHOUSE_OPTIONS_TOKEN,
                useFactory: options.useFactory,
                inject: options.inject || [],
            },
            ClickHouseService,
        ];
        return {
            module: ClickHouseModule,
            imports: options.imports,
            providers,
            exports: [ClickHouseService],
        };
    }
}
