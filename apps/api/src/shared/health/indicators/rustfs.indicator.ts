// ============================================================================
// Health Indicator - RustFS
// ============================================================================

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RustFSService } from '@a3s-lab/rustfs';

@Injectable()
export class RustFSHealthIndicator extends HealthIndicator {
    constructor(private readonly rustfs: RustFSService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const isHealthy = await this.rustfs.isHealthy();
            if (isHealthy) {
                return this.getStatus(key, true);
            }
            throw new Error('RustFS not healthy');
        } catch (error) {
            throw new HealthCheckError(
                'RustFS check failed',
                this.getStatus(key, false, { message: (error as Error).message }),
            );
        }
    }
}
