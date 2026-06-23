import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadModule } from '@a3s-lab/files';
import { KyselyService } from '@a3s-lab/kysely';
import {
    ApiResponseModule,
    ApiVersioningModule,
    ErrorsModule,
    SerializationModule,
    TransformModule,
} from '@a3s-lab/http';
import { HealthModule, MetricsModule, TrackingModule, createHealthCheck } from '@a3s-lab/observability';
import { RedissonService } from '@a3s-lab/redisson';
import { ResilienceModule } from '@a3s-lab/resilience';
import { sql } from 'kysely';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';

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

        // Metrics (Prometheus)
        MetricsModule,

        // Retry, circuit breaker, cache, rate limiting, distributed lock
        ResilienceModule.register(),

        // Health checks
        HealthModule.register({
            checks: [
                {
                    name: 'database',
                    inject: [KyselyService],
                    useFactory: (kysely: KyselyService<unknown>) =>
                        createHealthCheck('database', () => sql`SELECT 1`.execute(kysely), 'Database check failed'),
                },
                {
                    name: 'redis',
                    inject: [RedissonService],
                    useFactory: (redis: RedissonService) =>
                        createHealthCheck('redis', () => redis.getRedis().ping(), 'Redis check failed'),
                },
            ],
        }),

        // Serialization (class-transformer)
        SerializationModule,

        // API response wrapper
        ApiResponseModule,

        // API versioning
        ApiVersioningModule,

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
