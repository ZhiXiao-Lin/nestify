import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadModule } from '@a3s-lab/files';
import { SerializationModule, TransformModule } from '@a3s-lab/http';
import { ResilienceModule } from '@a3s-lab/resilience';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';

import { AuthModule } from './shared/auth';
import { MetricsModule } from './shared/metrics';
import { HealthModule } from './shared/health';
import { TenantModule } from './shared/tenant';
import { AuditModule } from './shared/audit';
import { ApiResponseModule } from './shared/api-response';
import { ApiVersioningModule } from './shared/api-versioning';
import { FeatureFlagsModule } from './shared/feature-flags';
import { ErrorsModule } from './shared/errors';
import { TrackingModule } from './shared/tracking';

@Module({
    imports: [
        // NestJS Config
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Database (Kysely + PostgreSQL)
        DatabaseModule,

        // Redis (Redisson)
        RedisModule,

        // Auth (JWT + RBAC)
        AuthModule,

        // Metrics (Prometheus)
        MetricsModule,

        // Retry, circuit breaker, cache, rate limiting, distributed lock
        ResilienceModule.register(),

        // Health checks
        HealthModule,

        // Serialization (class-transformer)
        SerializationModule,

        // Tenant isolation
        TenantModule,

        // Audit logging
        AuditModule,

        // API response wrapper
        ApiResponseModule,

        // API versioning
        ApiVersioningModule,

        // Feature flags
        FeatureFlagsModule,

        // File upload
        FileUploadModule,

        // Transform interceptor
        TransformModule,

        // Error handling
        ErrorsModule,

        // Request tracking
        TrackingModule,

        // Business modules
        OrderModule,
    ],
})
export class AppModule {}
