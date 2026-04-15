// ============================================================================
// Health Indicator - NATS
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { NatsService } from '@a3s-lab/nats';

@Injectable()
export class NatsHealthIndicator extends HealthIndicator {
    constructor(private readonly nats: NatsService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const isHealthy = await this.nats.isHealthy();
            if (isHealthy) {
                return this.getStatus(key, true);
            }
            throw new Error('NATS connection not healthy');
        } catch (error) {
            throw new HealthCheckError(
                'NATS check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
