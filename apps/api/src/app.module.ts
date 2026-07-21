import { FileUploadModule } from '@a3s-lab/files';
import {
    ApiResponseModule,
    ApiVersioningModule,
    ErrorsModule,
    SerializationModule,
    TransformModule,
} from '@a3s-lab/http';
import { createPostgresKyselyModuleOptions, KyselyModule, KyselyService } from '@a3s-lab/kysely';
import { createHealthCheck, HealthModule, MetricsModule, recordSql, TrackingModule } from '@a3s-lab/observability';
import { createRedissonModuleOptions, RedissonModule, RedissonService } from '@a3s-lab/redisson';
import { ResilienceModule } from '@a3s-lab/resilience';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { sql } from 'kysely';
import { OrderModule } from './modules/order/order.module';

const databaseModule = KyselyModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
        createPostgresKyselyModuleOptions({
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            user: configService.get<string>('DB_USERNAME', 'postgres'),
            password: configService.get<string>('DB_PASSWORD', 'postgres'),
            database: configService.get<string>('DB_DATABASE', 'nestify'),
            max: 10,
            logger: {
                consoleOutput: configService.get<string>('NODE_ENV') === 'development',
                onQuery: recordSql,
            },
        }),
});

const redisModule = RedissonModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
        createRedissonModuleOptions({
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            db: configService.get<number>('REDIS_DB', 0),
        }),
});

@Module({
    imports: [
        // NestJS Config
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Database (Kysely + PostgreSQL)
        databaseModule,

        // Redis (Redisson)
        redisModule,

        // Metrics (Prometheus)
        MetricsModule,

        // Retry, circuit breaker, cache, rate limiting, distributed lock
        ResilienceModule.register(),

        // Health checks
        HealthModule.register({
            imports: [databaseModule, redisModule],
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
