import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';

// Shared infrastructure modules
import { LoggerModule } from '@a3s-lab/logger';
import { AuthModule } from './shared/auth';
import { MetricsModule } from './shared/metrics';
import { CacheModule } from './shared/cache';
import { CircuitBreakerModule } from './shared/circuit-breaker';
import { RetryModule } from './shared/retry';
import { HealthModule } from './shared/health';
import { ValidationModule } from './shared/validation';
import { SerializationModule } from './shared/serialization';
import { RateLimitingModule } from './shared/rate-limiting';
import { TenantModule } from './shared/tenant';
import { AuditModule } from './shared/audit';
import { ApiResponseModule } from './shared/api-response';
import { ApiVersioningModule } from './shared/api-versioning';
import { FeatureFlagsModule } from './shared/feature-flags';
import { FileUploadModule } from './shared/file-upload';
import { TransformModule } from './shared/transform';
import { ErrorsModule } from './shared/errors';
import { OpenAPIModule } from './shared/openapi';
import { TrackingModule } from './shared/tracking';

@Module({
    imports: [
        // NestJS Config
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Logger (global JSON logging with request tracing)
        LoggerModule.register({
            level: process.env.LOG_LEVEL as any || 'info',
            name: 'nestify-api',
            json: true,
        }),

        // Database (Kysely + PostgreSQL)
        DatabaseModule,

        // Redis (Redisson)
        RedisModule,

        // Auth (JWT + RBAC)
        AuthModule,

        // Metrics (Prometheus)
        MetricsModule,

        // Cache
        CacheModule,

        // Circuit Breaker
        CircuitBreakerModule,

        // Retry with exponential backoff
        RetryModule,

        // Health checks
        HealthModule,

        // Validation
        ValidationModule,

        // Serialization (class-transformer)
        SerializationModule,

        // Rate limiting
        RateLimitingModule,

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

        // OpenAPI decorators
        OpenAPIModule,

        // Request tracking
        TrackingModule,

        // Business modules
        OrderModule,
    ],
})
export class AppModule {}
