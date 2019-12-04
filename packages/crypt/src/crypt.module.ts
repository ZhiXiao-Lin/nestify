import { DynamicModule, Module } from '@nestjs/common';
import { CRYPT_MODULE_OPTIONS } from './crypt.constants';
import { CryptModuleAsyncOptions, CryptModuleOptions } from './crypt.interfaces';
import { CryptService } from './crypt.service';

@Module({
    providers: [CryptService],
    exports: [CryptService]
})
export class CryptModule {
    public static register(options: CryptModuleOptions): DynamicModule {
        const providers = [
            {
                provide: CRYPT_MODULE_OPTIONS,
                useValue: options
            }
        ];

        return {
            module: CryptModule,
            providers: providers,
            exports: providers
        };
    }

    public static registerAsync(options: CryptModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: CRYPT_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: CryptModule,
            imports: options.imports,
            providers: providers,
            exports: providers
        };
    }
}
