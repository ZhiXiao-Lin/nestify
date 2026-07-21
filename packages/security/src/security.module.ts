import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
    AUTH_GUARD_DELEGATE,
    AuthGuardDelegate,
    DEFAULT_DENY_AUTH_GUARD_OPTIONS,
    DefaultDenyAuthGuard,
    DefaultDenyAuthGuardOptions,
} from './auth.guard';

export interface SecurityModuleOptions {
    authGuardDelegate?: Type<AuthGuardDelegate>;
    defaultDenyOptions?: DefaultDenyAuthGuardOptions;
    installGlobally?: boolean;
}

@Module({})
export class SecurityModule {
    static register(options: SecurityModuleOptions = {}): DynamicModule {
        const providers: Provider[] = [
            DefaultDenyAuthGuard,
            {
                provide: DEFAULT_DENY_AUTH_GUARD_OPTIONS,
                useValue: options.defaultDenyOptions ?? {},
            },
        ];
        const exports: DynamicModule['exports'] = [DefaultDenyAuthGuard, DEFAULT_DENY_AUTH_GUARD_OPTIONS];

        if (options.installGlobally !== false) {
            providers.push({
                provide: APP_GUARD,
                useExisting: DefaultDenyAuthGuard,
            });
        }

        if (options.authGuardDelegate) {
            providers.push({
                provide: AUTH_GUARD_DELEGATE,
                useExisting: options.authGuardDelegate,
            });
            providers.push(options.authGuardDelegate);
            exports.push(AUTH_GUARD_DELEGATE);
        }

        return {
            module: SecurityModule,
            providers,
            exports,
        };
    }
}
