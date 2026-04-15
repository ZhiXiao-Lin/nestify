// ============================================================================
// Health Module
// ============================================================================

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';
import { NatsHealthIndicator } from './indicators/nats.indicator';
import { RustFSHealthIndicator } from './indicators/rustfs.indicator';

@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [
        DatabaseHealthIndicator,
        RedisHealthIndicator,
        NatsHealthIndicator,
        RustFSHealthIndicator,
    ],
})
export class HealthModule {}
