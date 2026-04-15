// ============================================================================
// Tenant Interceptor - Automatically extracts tenant from request
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
    constructor(private readonly tenantService: TenantService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user?.organizationId) {
            this.tenantService.setContext({
                organizationId: user.organizationId,
                userId: user.sub,
                roles: user.roles,
            });
        }

        return next.handle();
    }
}
