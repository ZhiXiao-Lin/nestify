import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadModule } from '@a3s-lab/files';
import {
    ApiResponseModule,
    ApiVersioningModule,
    ErrorsModule,
    SerializationModule,
    TransformModule,
} from '@a3s-lab/http';
import { MetricsModule, TrackingModule } from '@a3s-lab/observability';
import { ResilienceModule } from '@a3s-lab/resilience';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';

import { AuthModule } from './shared/auth';
import { HealthModule } from './shared/health';
import { TenantModule } from './shared/tenant';
import { AuditModule } from './shared/audit';
import { FeatureFlagsModule } from './shared/feature-flags';

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
