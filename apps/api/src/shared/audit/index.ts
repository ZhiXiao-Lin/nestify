import { Global, Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

export * from './audit.service';
export * from './audit.interceptor';
export * from './audit.decorator';

@Global()
@Module({
    providers: [AuditService, AuditInterceptor],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
