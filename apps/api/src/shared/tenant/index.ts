import { Global, Module } from '@nestjs/common';
import { OptionalTenantGuard, TenantGuard } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantService } from './tenant.service';

export * from './tenant.service';
export * from './tenant.guard';
export * from './tenant.interceptor';
export * from './tenant.decorator';

@Global()
@Module({
    providers: [TenantService, TenantGuard, OptionalTenantGuard, TenantInterceptor],
    exports: [TenantService, TenantGuard, OptionalTenantGuard, TenantInterceptor],
})
export class TenantModule {}
