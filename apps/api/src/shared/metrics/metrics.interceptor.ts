// ============================================================================
// Metrics Interceptor - Automatically records HTTP metrics
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    private readonly logger = new Logger(MetricsInterceptor.name);

    constructor(private readonly metricsService: MetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const startTime = process.hrtime.bigint();
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Track active requests
        this.metricsService.incGauge('http_active_requests');

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = this.getDuration(startTime);
                    this.recordMetrics(request, response, duration);
                    this.metricsService.decGauge('http_active_requests');
                },
                error: (error) => {
                    const duration = this.getDuration(startTime);
                    // On error, status might not be set, default to 500
                    const status = error.status || 500;
                    this.recordMetrics(request, response, duration, status);
                    this.metricsService.decGauge('http_active_requests');
                },
            }),
        );
    }

    private recordMetrics(request: Request, response: Response, duration: number, status?: number): void {
        const method = request.method;
        const path = this.normalizePath(request.route?.path || request.path);
        const statusCode = status ?? response.statusCode;

        // Convert duration to seconds
        const durationSeconds = duration / 1e9;

        this.metricsService.recordHttpRequest(method, path, statusCode, durationSeconds);

        // Record request/response size if available
        const requestSize = parseInt(request.headers['content-length'] as string) || 0;
        const responseSize = parseInt(response.get('content-length') as string) || 0;

        if (requestSize > 0) {
            this.metricsService.observeHistogram('http_request_size_bytes', requestSize, { method, path });
        }
        if (responseSize > 0) {
            this.metricsService.observeHistogram('http_response_size_bytes', responseSize, { method, path });
        }
    }

    /**
     * Normalize path to avoid high cardinality
     * Replaces dynamic segments like IDs with placeholders
     */
    private normalizePath(path: string): string {
        // Replace UUIDs
        path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
        // Replace numeric IDs
        path = path.replace(/\/\d+/g, '/:id');
        return path;
    }

    /**
     * Get duration in nanoseconds and convert to number
     */
    private getDuration(startTime: bigint): number {
        return Number(process.hrtime.bigint() - startTime);
    }
}
