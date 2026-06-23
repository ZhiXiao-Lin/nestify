// ============================================================================
// Health Indicator - Database
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { KyselyService } from '@a3s-lab/kysely';
import { sql } from 'kysely';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
    constructor(private readonly kysely: KyselyService<unknown>) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            await sql`SELECT 1`.execute(this.kysely);
            return this.getStatus(key, true);
        } catch (error) {
            throw new HealthCheckError(
                'Database check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
