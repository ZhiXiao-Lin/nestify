// ============================================================================
// Health Module
// ============================================================================

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';

@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [
        DatabaseHealthIndicator,
        RedisHealthIndicator,
    ],
})
export class HealthModule {}
