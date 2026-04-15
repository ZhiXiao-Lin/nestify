// ============================================================================
// Health Indicator - Database
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { KyselyService } from '@a3s-lab/kysely';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
    constructor(private readonly kysely: KyselyService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await this.kysely.execute('SELECT 1');
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'Database check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
