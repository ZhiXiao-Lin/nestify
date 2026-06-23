import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Logger,
    Module,
    Provider,
    SetMetadata,
    Type,
    applyDecorators,
    UseGuards,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import * as nodePath from 'node:path';
import type { Request } from 'express';

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

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', '0:0:0:0:0:0:0:1', 'localhost']);

@Injectable()
export class LocalOnlyGuard implements CanActivate {
    private readonly logger = new Logger(LocalOnlyGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const remote = request.socket?.remoteAddress || request.ip;
        if (!remote || !LOOPBACK_HOSTS.has(remote)) {
            this.logger.warn(`[local-only] denied: remote=${remote ?? 'unknown'}`);
            throw new ForbiddenException('local-only endpoint');
        }
        return true;
    }
}

@Injectable()
export class DevOnlyGuard implements CanActivate {
    canActivate(): boolean {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('development-only endpoint');
        }
        return true;
    }
}

export function DevOnly(): MethodDecorator & ClassDecorator {
    return applyDecorators(UseGuards(DevOnlyGuard));
}

export class PathSecurityValidator {
    static hasPathTraversal(pathStr: string): boolean {
        return pathStr.split(/[\\/]+/).some(part => part === '..');
    }

    static normalizePath(pathStr: string): string {
        const normalized = pathStr.replace(/\/+$/, '');
        const parts = normalized.split('/');
        const resolved: string[] = [];
        for (const part of parts) {
            if (part === '..') {
                resolved.pop();
            } else if (part !== '.' && part !== '') {
                resolved.push(part);
            }
        }
        return `/${resolved.join('/')}`;
    }

    static isWithinRoot(pathStr: string, root: string): boolean {
        const normalizedPath = nodePath.normalize(pathStr);
        const normalizedRoot = nodePath.normalize(root);
        return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}${nodePath.sep}`);
    }

    static pathStartsWith(pathStr: string, prefix: string): boolean {
        return pathStr === prefix || pathStr.startsWith(`${prefix}/`);
    }

    static resolveAndValidate(baseRoot: string, relativePath: string): string {
        const normalized = nodePath.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const absolutePath = nodePath.join(baseRoot, normalized);
        if (!this.isWithinRoot(absolutePath, baseRoot)) {
            throw new Error('Invalid path: path traversal detected');
        }
        return absolutePath;
    }

    static validatePathAccess(
        pathStr: string,
        options: { blockedPaths?: string[]; allowedPaths?: string[] } = {},
    ): { valid: boolean; violations: string[] } {
        const violations: string[] = [];
        const { blockedPaths = [], allowedPaths = [] } = options;

        if (this.hasPathTraversal(pathStr)) {
            violations.push('Path traversal detected');
        }

        const normalizedPath = this.normalizePath(pathStr.startsWith('/') ? pathStr : `/${pathStr}`);
        for (const blockedPath of blockedPaths) {
            if (this.pathStartsWith(normalizedPath, blockedPath)) {
                violations.push(`Access to blocked path: ${blockedPath}`);
            }
        }

        if (
            allowedPaths.length > 0 &&
            !allowedPaths.some(allowedPath => this.pathStartsWith(normalizedPath, allowedPath))
        ) {
            violations.push('Path not in allowed list');
        }

        return { valid: violations.length === 0, violations };
    }

    static sanitizePath(pathStr: string): string {
        return pathStr
            .replace(/\0/g, '')
            .replace(/^(\.\.(\/|\\|$))+/, '')
            .replace(/[\r\n]/g, '');
    }
}

export const SENSITIVE_OPERATION_KEY = 'sensitive_operation';

export interface SensitiveOperationOptions {
    operation: string;
    requireReauth?: boolean;
    description?: string;
}

export function MarkSensitive(
    operation: string,
    options: { requireReauth?: boolean; description?: string } = {},
): MethodDecorator {
    return applyDecorators(
        SetMetadata(SENSITIVE_OPERATION_KEY, {
            operation,
            requireReauth: options.requireReauth ?? true,
            description: options.description,
        } satisfies SensitiveOperationOptions),
    );
}

export const AuditedDelete = () =>
    MarkSensitive('resource:delete', { requireReauth: true, description: 'Delete resource' });
export const AuditedCreate = () =>
    MarkSensitive('resource:create', { requireReauth: false, description: 'Create resource' });
export const AuditedUpdate = () =>
    MarkSensitive('resource:update', { requireReauth: false, description: 'Update resource' });

export interface JwtPayload {
    sub: string;
    email?: string;
    organizationId?: string | null;
    roles?: string[];
    permissions?: string[];
    type?: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}
