import { DynamicModule, Module } from '@nestjs/common';
import { ARENA_OPTIONS } from './arena.constants';
import { ArenaModuleAsyncOptions, ArenaModuleOptions } from './arena.interfaces';
import { ArenaService } from './arena.service';

@Module({
    providers: [ArenaService],
    exports: [ArenaService]
})
export class ArenaModule {
    public static register(options: ArenaModuleOptions): DynamicModule {
        const providers = [
            {
                provide: ARENA_OPTIONS,
                useValue: options || {}
            }
        ];

        return {
            module: ArenaModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: ArenaModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: ARENA_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: ArenaModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}
