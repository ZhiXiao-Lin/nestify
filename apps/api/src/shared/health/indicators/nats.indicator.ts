// ============================================================================
// Health Indicator - NATS
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { IMessagingService } from '../../infrastructure/messaging/messaging.interface';

@Injectable()
export class NatsHealthIndicator extends HealthIndicator {
    constructor(private readonly nats: IMessagingService) {
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
