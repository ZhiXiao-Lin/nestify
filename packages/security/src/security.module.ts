import { Module, Provider, Type } from '@nestjs/common';
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
}

@Module({})
export class SecurityModule {
    static register(options: SecurityModuleOptions = {}) {
        const providers: Provider[] = [
            DefaultDenyAuthGuard,
            {
                provide: DEFAULT_DENY_AUTH_GUARD_OPTIONS,
                useValue: options.defaultDenyOptions ?? {},
            },
        ];

        if (options.authGuardDelegate) {
            providers.push({
                provide: AUTH_GUARD_DELEGATE,
                useExisting: options.authGuardDelegate,
            });
            providers.push(options.authGuardDelegate);
        }

        return {
            module: SecurityModule,
            providers,
            exports: [DefaultDenyAuthGuard, AUTH_GUARD_DELEGATE, DEFAULT_DENY_AUTH_GUARD_OPTIONS],
        };
    }
}
