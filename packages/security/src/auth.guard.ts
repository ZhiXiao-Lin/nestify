import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

export const PUBLIC_ROUTE_KEY = 'auth:public-route';
export const Public = (): ClassDecorator & MethodDecorator => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const AUTH_GUARD_DELEGATE = Symbol('AUTH_GUARD_DELEGATE');

export interface AuthGuardDelegate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface DefaultDenyAuthGuardOptions {
    bypass?: (context: ExecutionContext) => boolean | Promise<boolean>;
}

export const DEFAULT_DENY_AUTH_GUARD_OPTIONS = Symbol('DEFAULT_DENY_AUTH_GUARD_OPTIONS');

@Injectable()
export class DefaultDenyAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly moduleRef: ModuleRef,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const options = this.moduleRef.get<DefaultDenyAuthGuardOptions | undefined>(DEFAULT_DENY_AUTH_GUARD_OPTIONS, {
            strict: false,
        });
        if (await options?.bypass?.(context)) {
            return true;
        }

        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        let delegate: AuthGuardDelegate;
        try {
            delegate = this.moduleRef.get<AuthGuardDelegate>(AUTH_GUARD_DELEGATE, { strict: false });
        } catch {
            throw new ForbiddenException('authentication guard is not configured');
        }
        return delegate.canActivate(context);
    }
}
