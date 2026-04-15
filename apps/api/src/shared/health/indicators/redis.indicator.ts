// ============================================================================
// Health Indicator - Redis
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedissonService } from '@a3s-lab/redisson';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(private readonly redis: RedissonService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.redis.ping();
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'Redis check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
