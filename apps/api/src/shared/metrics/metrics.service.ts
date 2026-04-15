// ============================================================================
// Metrics Service - Prometheus + OpenTelemetry metrics
// ============================================================================

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Counter metric - for counting events (e.g., requests, errors)
 */
export interface CounterMetric {
    name: string;
    help: string;
    labelNames?: string[];
}

/**
 * Gauge metric - for current values (e.g., queue size, memory usage)
 */
export interface GaugeMetric {
    name: string;
    help: string;
    labelNames?: string[];
}

/**
 * Histogram metric - for distributions (e.g., request duration, response size)
 */
export interface HistogramMetric {
    name: string;
    help: string;
    labelNames?: string[];
    buckets?: number[];
}

/**
 * Default buckets for HTTP request duration
 */
export const DEFAULT_HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Default buckets for HTTP request size in bytes
 */
export const DEFAULT_SIZE_BUCKETS = [100, 1000, 10000, 100000, 1000000, 10000000];

/**
 * Metrics Service - provides Prometheus-compatible metrics
 */
@Injectable()
export class MetricsService implements OnModuleDestroy {
    private readonly logger = new Logger(MetricsService.name);
    private readonly counters: Map<string, number> = new Map();
    private readonly gauges: Map<string, number> = new Map();
    private readonly histograms: Map<string, number[]> = new Map();
    private readonly labelValues: Map<string, Record<string, string>> = new Map();

    // Default metrics
    private readonly defaultCounters: CounterMetric[] = [
        { name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'path', 'status'] },
        { name: 'http_errors_total', help: 'Total HTTP errors', labelNames: ['method', 'path', 'status'] },
        { name: 'db_queries_total', help: 'Total database queries', labelNames: ['operation', 'table'] },
        { name: 'cache_hits_total', help: 'Total cache hits', labelNames: ['cache'] },
        { name: 'cache_misses_total', help: 'Total cache misses', labelNames: ['cache'] },
    ];

    private readonly defaultGauges: GaugeMetric[] = [
        { name: 'http_active_requests', help: 'Active HTTP requests' },
        { name: 'db_connection_pool_size', help: 'Database connection pool size' },
        { name: 'db_connection_pool_used', help: 'Database connection pool used' },
        { name: 'redis_connection_status', help: 'Redis connection status (1=up, 0=down)' },
    ];

    private readonly defaultHistograms: HistogramMetric[] = [
        { name: 'http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'path'], buckets: DEFAULT_HISTOGRAM_BUCKETS },
        { name: 'http_request_size_bytes', help: 'HTTP request size', labelNames: ['method', 'path'], buckets: DEFAULT_SIZE_BUCKETS },
        { name: 'http_response_size_bytes', help: 'HTTP response size', labelNames: ['method', 'path'], buckets: DEFAULT_SIZE_BUCKETS },
        { name: 'db_query_duration_seconds', help: 'Database query duration', labelNames: ['operation', 'table'], buckets: DEFAULT_HISTOGRAM_BUCKETS },
    ];

    constructor() {
        this.initializeMetrics();
    }

    private initializeMetrics(): void {
        // Initialize counters
        for (const counter of this.defaultCounters) {
            const key = this.getKey(counter.name, counter.labelNames);
            this.counters.set(key, 0);
        }

        // Initialize gauges
        for (const gauge of this.defaultGauges) {
            const key = this.getKey(gauge.name, gauge.labelNames);
            this.gauges.set(key, 0);
        }

        // Initialize histograms
        for (const histogram of this.defaultHistograms) {
            const key = this.getKey(histogram.name, histogram.labelNames);
            this.histograms.set(key, []);
        }

        this.logger.log('Metrics initialized');
    }

    private getKey(name: string, labelNames?: string[]): string {
        return labelNames ? `${name}:${labelNames.join(',')}` : name;
    }

    private getLabelValues(labelNames: string[], labels: Record<string, string>): string[] {
        return labelNames.map(name => labels[name] ?? 'unknown');
    }

    // =========================================================================
    // Counter Operations
    // =========================================================================

    /**
     * Increment a counter
     */
    incCounter(name: string, labels?: Record<string, string>, amount = 1): void {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        const current = this.counters.get(key) ?? 0;
        this.counters.set(key, current + amount);
    }

    /**
     * Get counter value
     */
    getCounter(name: string, labels?: Record<string, string>): number {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        return this.counters.get(key) ?? 0;
    }

    // =========================================================================
    // Gauge Operations
    // =========================================================================

    /**
     * Set a gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        this.gauges.set(key, value);
    }

    /**
     * Increment a gauge
     */
    incGauge(name: string, labels?: Record<string, string>, amount = 1): void {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        const current = this.gauges.get(key) ?? 0;
        this.gauges.set(key, current + amount);
    }

    /**
     * Decrement a gauge
     */
    decGauge(name: string, labels?: Record<string, string>, amount = 1): void {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        const current = this.gauges.get(key) ?? 0;
        this.gauges.set(key, current - amount);
    }

    /**
     * Get gauge value
     */
    getGauge(name: string, labels?: Record<string, string>): number {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        return this.gauges.get(key) ?? 0;
    }

    // =========================================================================
    // Histogram Operations
    // =========================================================================

    /**
     * Observe a value in histogram
     */
    observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        const values = this.histograms.get(key) ?? [];
        values.push(value);
        this.histograms.set(key, values);
    }

    /**
     * Get histogram values
     */
    getHistogram(name: string, labels?: Record<string, string>): number[] {
        const key = this.getKey(name, Object.keys(labels ?? {}));
        return this.histograms.get(key) ?? [];
    }

    /**
     * Calculate histogram statistics
     */
    getHistogramStats(name: string, labels?: Record<string, string>): { count: number; sum: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } {
        const values = this.getHistogram(name, labels);
        if (values.length === 0) {
            return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const count = sorted.length;

        return {
            count,
            sum,
            min: sorted[0],
            max: sorted[count - 1],
            avg: sum / count,
            p50: sorted[Math.floor(count * 0.5)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
        };
    }

    // =========================================================================
    // Convenience Methods
    // =========================================================================

    /**
     * Record HTTP request
     */
    recordHttpRequest(method: string, path: string, status: number, duration: number): void {
        const labels = { method, path, status: status.toString() };
        this.incCounter('http_requests_total', labels);
        if (status >= 400) {
            this.incCounter('http_errors_total', labels);
        }
        this.observeHistogram('http_request_duration_seconds', duration, { method, path });
    }

    /**
     * Record database query
     */
    recordDbQuery(operation: string, table: string, duration: number): void {
        this.incCounter('db_queries_total', { operation, table });
        this.observeHistogram('db_query_duration_seconds', duration, { operation, table });
    }

    /**
     * Record cache hit
     */
    recordCacheHit(cache: string): void {
        this.incCounter('cache_hits_total', { cache });
    }

    /**
     * Record cache miss
     */
    recordCacheMiss(cache: string): void {
        this.incCounter('cache_misses_total', { cache });
    }

    // =========================================================================
    // Export
    // =========================================================================

    /**
     * Get all metrics in Prometheus format
     */
    toPrometheusFormat(): string {
        const lines: string[] = [];

        // Export counters
        for (const [key, value] of this.counters.entries()) {
            lines.push(`# HELP ${key} counter`);
            lines.push(`# TYPE ${key} counter`);
            lines.push(`${key} ${value}`);
        }

        // Export gauges
        for (const [key, value] of this.gauges.entries()) {
            lines.push(`# HELP ${key} gauge`);
            lines.push(`# TYPE ${key} gauge`);
            lines.push(`${key} ${value}`);
        }

        // Export histograms (as summary for simplicity)
        for (const [key, values] of this.histograms.entries()) {
            if (values.length === 0) continue;
            const stats = this.getHistogramStats(key.split(':')[0]);
            lines.push(`# HELP ${key} histogram`);
            lines.push(`# TYPE ${key} histogram`);
            lines.push(`${key}_count ${stats.count}`);
            lines.push(`${key}_sum ${stats.sum}`);
            lines.push(`${key}_avg ${stats.avg}`);
        }

        return lines.join('\n');
    }

    /**
     * Get all metrics as JSON
     */
    toJSON(): Record<string, unknown> {
        return {
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(
                [...this.histograms.entries()].map(([k, v]) => [k, this.getHistogramStats(k.split(':')[0])])
            ),
        };
    }

    onModuleDestroy(): void {
        this.logger.log('Metrics service destroyed');
    }
}
