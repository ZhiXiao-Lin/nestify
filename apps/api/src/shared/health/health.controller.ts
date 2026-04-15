// ============================================================================
// Health Controller - Health check endpoints
// ============================================================================

import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { RedisHealthIndicator } from './indicators/redis.indicator';

@ApiTags('Health')
@Controller()
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly databaseIndicator: DatabaseHealthIndicator,
        private readonly redisIndicator: RedisHealthIndicator,
    ) {}

    @Get('health')
    @HealthCheck()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    @ApiResponse({ status: 503, description: 'Service is unhealthy' })
    async check(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.databaseIndicator.isHealthy('database'),
            () => this.redisIndicator.isHealthy('redis'),
        ]);
    }

    @Get('health/live')
    @ApiOperation({ summary: 'Liveness probe - is the service running?' })
    @ApiResponse({ status: 200, description: 'Service is alive' })
    live(): { status: string } {
        return { status: 'ok' };
    }

    @Get('health/ready')
    @HealthCheck()
    @ApiOperation({ summary: 'Readiness probe - is the service ready to accept traffic?' })
    @ApiResponse({ status: 200, description: 'Service is ready' })
    @ApiResponse({ status: 503, description: 'Service is not ready' })
    async ready(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.databaseIndicator.isHealthy('database'),
            () => this.redisIndicator.isHealthy('redis'),
        ]);
    }
}
