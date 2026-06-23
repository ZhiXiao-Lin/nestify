import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    DefaultDenyAuthGuard,
    MarkSensitive,
    PathSecurityValidator,
    Public,
    PUBLIC_ROUTE_KEY,
    SENSITIVE_OPERATION_KEY,
} from '../index';

describe('security utilities', () => {
    it('detects traversal and validates allowed or blocked paths', () => {
        expect(PathSecurityValidator.hasPathTraversal('/safe/../secret')).toBe(true);
        expect(PathSecurityValidator.hasPathTraversal('/safe/path')).toBe(false);
        expect(PathSecurityValidator.normalizePath('/safe/./nested/')).toBe('/safe/nested');
        expect(PathSecurityValidator.validatePathAccess('/admin/users', { blockedPaths: ['/admin'] })).toEqual({
            valid: false,
            violations: ['Access to blocked path: /admin'],
        });
        expect(PathSecurityValidator.validatePathAccess('/api/orders', { allowedPaths: ['/api'] })).toEqual({
            valid: true,
            violations: [],
        });
    });

    it('sanitizes and resolves paths within a root directory', () => {
        expect(PathSecurityValidator.sanitizePath('../unsafe\npath')).toBe('unsafepath');
        expect(PathSecurityValidator.resolveAndValidate('/tmp/root', '../file.txt')).toBe('/tmp/root/file.txt');
        expect(PathSecurityValidator.isWithinRoot('/tmp/root/file.txt', '/tmp/root')).toBe(true);
    });

    it('sets public and sensitive operation metadata', () => {
        class Controller {
            handler() {}
        }

        Public()(Controller.prototype, 'handler', Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')!);
        MarkSensitive('orders:delete', { requireReauth: true, description: 'Delete order' })(
            Controller.prototype,
            'handler',
            Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')!,
        );

        expect(Reflect.getMetadata(PUBLIC_ROUTE_KEY, Controller.prototype.handler)).toBe(true);
        expect(Reflect.getMetadata(SENSITIVE_OPERATION_KEY, Controller.prototype.handler)).toEqual({
            operation: 'orders:delete',
            requireReauth: true,
            description: 'Delete order',
        });
    });

    it('allows public routes before requiring a configured delegate', async () => {
        const guard = new DefaultDenyAuthGuard(
            { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector,
            { get: jest.fn().mockReturnValue({}) },
        );

        await expect(guard.canActivate(createExecutionContext())).resolves.toBe(true);
    });

    it('fails closed when no auth delegate is configured', async () => {
        const guard = new DefaultDenyAuthGuard(
            { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector,
            {
                get: jest.fn((token: unknown) => {
                    if (typeof token === 'symbol' && token.description === 'DEFAULT_DENY_AUTH_GUARD_OPTIONS') {
                        return {};
                    }
                    throw new Error('missing provider');
                }),
            },
        );

        await expect(guard.canActivate(createExecutionContext())).rejects.toBeInstanceOf(ForbiddenException);
    });
});

function createExecutionContext() {
    return {
        getHandler: () => function handler() {},
        getClass: () => class Controller {},
        switchToHttp: () => ({
            getRequest: () => ({ socket: { remoteAddress: '127.0.0.1' } }),
        }),
    } as never;
}
