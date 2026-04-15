// ============================================================================
// Metrics Controller - Exposes /metrics endpoint for Prometheus
// ============================================================================

import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-Type', 'text/plain')
    @ApiOperation({ summary: 'Prometheus metrics endpoint' })
    @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
    getMetrics(): string {
        return this.metricsService.toPrometheusFormat();
    }

    @Get('json')
    @ApiOperation({ summary: 'Metrics in JSON format' })
    @ApiResponse({ status: 200, description: 'Metrics in JSON format' })
    getMetricsJson(): Record<string, unknown> {
        return this.metricsService.toJSON();
    }
}
