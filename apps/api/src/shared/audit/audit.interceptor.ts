// ============================================================================
// Audit Interceptor - Automatically logs operations
// ============================================================================

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * Decorator to mark endpoint for audit logging
 */
export function AuditedAction(action: string) {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(AUDIT_ACTION_KEY, action, descriptor.value);
        return descriptor;
    };
}

/**
 * Decorator to specify audit resource
 */
export function AuditedResource(resource: string) {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(AUDIT_RESOURCE_KEY, resource, descriptor.value);
        return descriptor;
    };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly auditService: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const user = (request as any).user;
        const action = this.getAction(context);
        const resource = this.getResource(context);

        if (!user?.sub || !action || !resource) {
            return next.handle();
        }

        const startTime = Date.now();
        const ipAddress = this.getClientIp(request);
        const userAgent = request.headers['user-agent'];

        return next.handle().pipe(
            tap(async response => {
                const duration = Date.now() - startTime;
                await this.auditService.log({
                    userId: user.sub,
                    organizationId: user.organizationId,
                    action,
                    resource,
                    resourceId: response?.id ?? request.params?.id,
                    metadata: {
                        method: request.method,
                        path: request.path,
                        duration,
                    },
                    ipAddress,
                    userAgent,
                    status: 'success',
                });
            }),
            catchError(async error => {
                const duration = Date.now() - startTime;
                await this.auditService.log({
                    userId: user.sub,
                    organizationId: user.organizationId,
                    action,
                    resource,
                    resourceId: request.params?.id,
                    metadata: {
                        method: request.method,
                        path: request.path,
                        duration,
                    },
                    ipAddress,
                    userAgent,
                    status: 'error',
                    errorMessage: error.message,
                });

                throw error;
            }),
        );
    }

    private getAction(context: ExecutionContext): string | undefined {
        return Reflect.getMetadata(AUDIT_ACTION_KEY, context.getHandler()) || this.inferAction(context);
    }

    private getResource(context: ExecutionContext): string | undefined {
        return Reflect.getMetadata(AUDIT_RESOURCE_KEY, context.getHandler()) || this.inferResource(context);
    }

    private inferAction(context: ExecutionContext): string {
        const method = context.getHandler().name;
        const httpMethod = context.switchToHttp().getRequest().method;

        // Map HTTP methods to CRUD actions
        const actionMap: Record<string, string> = {
            GET: 'read',
            POST: 'create',
            PUT: 'update',
            PATCH: 'update',
            DELETE: 'delete',
        };

        return actionMap[httpMethod] ?? method;
    }

    private inferResource(context: ExecutionContext): string {
        const controller = context.getClass();
        return controller.name.replace('Controller', '').toLowerCase();
    }

    private getClientIp(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
            return ips.trim();
        }
        return request.ip ?? request.socket.remoteAddress ?? 'unknown';
    }
}
