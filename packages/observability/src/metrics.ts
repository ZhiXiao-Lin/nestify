import { CallHandler, ExecutionContext, Injectable, NestInterceptor, OnModuleDestroy } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

export interface CounterMetric {
    name: string;
    help: string;
}

export interface GaugeMetric {
    name: string;
    help: string;
}

export interface HistogramMetric {
    name: string;
    help: string;
    buckets?: number[];
}

export const DEFAULT_HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
export const DEFAULT_SIZE_BUCKETS = [100, 1000, 10000, 100000, 1000000, 10000000];

@Injectable()
export class MetricsService implements OnModuleDestroy {
    private readonly counters = new Map<string, number>();
    private readonly gauges = new Map<string, number>();
    private readonly histograms = new Map<string, number[]>();
    private readonly counterDefs = new Map<string, CounterMetric>();
    private readonly gaugeDefs = new Map<string, GaugeMetric>();
    private readonly histogramDefs = new Map<string, HistogramMetric>();

    constructor() {
        this.registerCounter({ name: 'http_requests_total', help: 'Total HTTP requests' });
        this.registerCounter({ name: 'http_errors_total', help: 'Total HTTP errors' });
        this.registerGauge({ name: 'http_active_requests', help: 'Active HTTP requests' });
        this.registerHistogram({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration',
            buckets: DEFAULT_HISTOGRAM_BUCKETS,
        });
        this.registerHistogram({
            name: 'http_request_size_bytes',
            help: 'HTTP request size',
            buckets: DEFAULT_SIZE_BUCKETS,
        });
        this.registerHistogram({
            name: 'http_response_size_bytes',
            help: 'HTTP response size',
            buckets: DEFAULT_SIZE_BUCKETS,
        });
    }

    registerCounter(metric: CounterMetric): void {
        this.counterDefs.set(metric.name, metric);
        if (!this.counters.has(metric.name)) this.counters.set(metric.name, 0);
    }

    registerGauge(metric: GaugeMetric): void {
        this.gaugeDefs.set(metric.name, metric);
        if (!this.gauges.has(metric.name)) this.gauges.set(metric.name, 0);
    }

    registerHistogram(metric: HistogramMetric): void {
        this.histogramDefs.set(metric.name, metric);
    }

    incCounter(name: string, labels?: Record<string, string>, value = 1): void {
        const key = this.getKey(name, labels);
        this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    }

    getCounter(name: string, labels?: Record<string, string>): number {
        return this.counters.get(this.getKey(name, labels)) ?? 0;
    }

    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        this.gauges.set(this.getKey(name, labels), value);
    }

    incGauge(name: string, labels?: Record<string, string>, value = 1): void {
        const key = this.getKey(name, labels);
        this.gauges.set(key, (this.gauges.get(key) ?? 0) + value);
    }

    decGauge(name: string, labels?: Record<string, string>, value = 1): void {
        this.incGauge(name, labels, -value);
    }

    getGauge(name: string, labels?: Record<string, string>): number {
        return this.gauges.get(this.getKey(name, labels)) ?? 0;
    }

    observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
        const key = this.getKey(name, labels);
        const values = this.histograms.get(key) ?? [];
        values.push(value);
        this.histograms.set(key, values);
    }

    recordHttpRequest(method: string, path: string, statusCode: number, durationSeconds: number): void {
        const labels = { method, path, status: String(statusCode) };
        this.incCounter('http_requests_total', labels);
        if (statusCode >= 400) this.incCounter('http_errors_total', labels);
        this.observeHistogram('http_request_duration_seconds', durationSeconds, { method, path });
    }

    toJSON(): Record<string, unknown> {
        return {
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(this.histograms),
        };
    }

    toPrometheusFormat(): string {
        const lines: string[] = [];
        for (const [key, value] of this.counters) {
            const parsed = this.parseKey(key);
            const def = this.counterDefs.get(parsed.name);
            if (def && !lines.includes(`# TYPE ${parsed.name} counter`)) {
                lines.push(`# HELP ${parsed.name} ${def.help}`, `# TYPE ${parsed.name} counter`);
            }
            lines.push(`${parsed.name}${formatLabels(parsed.labels)} ${value}`);
        }
        for (const [key, value] of this.gauges) {
            const parsed = this.parseKey(key);
            const def = this.gaugeDefs.get(parsed.name);
            if (def && !lines.includes(`# TYPE ${parsed.name} gauge`)) {
                lines.push(`# HELP ${parsed.name} ${def.help}`, `# TYPE ${parsed.name} gauge`);
            }
            lines.push(`${parsed.name}${formatLabels(parsed.labels)} ${value}`);
        }
        for (const [key, values] of this.histograms) {
            if (values.length === 0) continue;
            const parsed = this.parseKey(key);
            const def = this.histogramDefs.get(parsed.name);
            const buckets = def?.buckets ?? DEFAULT_HISTOGRAM_BUCKETS;
            if (def && !lines.includes(`# TYPE ${parsed.name} histogram`)) {
                lines.push(`# HELP ${parsed.name} ${def.help}`, `# TYPE ${parsed.name} histogram`);
            }
            const sorted = [...values].sort((a, b) => a - b);
            for (const bucket of buckets) {
                const count = sorted.filter(v => v <= bucket).length;
                lines.push(`${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: String(bucket) })} ${count}`);
            }
            lines.push(`${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: '+Inf' })} ${values.length}`);
            lines.push(`${parsed.name}_count${formatLabels(parsed.labels)} ${values.length}`);
            lines.push(
                `${parsed.name}_sum${formatLabels(parsed.labels)} ${values.reduce((sum, value) => sum + value, 0)}`,
            );
        }
        return `${lines.join('\n')}\n`;
    }

    onModuleDestroy(): void {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
    }

    private getKey(name: string, labels?: Record<string, string>): string {
        if (!labels || Object.keys(labels).length === 0) return name;
        const labelStr = Object.entries(labels)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)] as const)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
        return labelStr ? `${name}{${labelStr}}` : name;
    }

    private parseKey(key: string): { name: string; labels: Record<string, string> } {
        const openIndex = key.indexOf('{');
        if (openIndex < 0 || !key.endsWith('}')) return { name: key, labels: {} };
        const labels: Record<string, string> = {};
        const inner = key.slice(openIndex + 1, -1);
        for (const pair of inner.split(',')) {
            const eq = pair.indexOf('=');
            if (eq > 0) labels[pair.slice(0, eq)] = pair.slice(eq + 1);
        }
        return { name: key.slice(0, openIndex), labels };
    }
}

function formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) return '';
    return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',')}}`;
}

function escapeLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const startTime = process.hrtime.bigint();
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        this.metricsService.incGauge('http_active_requests');

        return next.handle().pipe(
            tap({
                next: () => this.recordMetrics(request, response, Number(process.hrtime.bigint() - startTime)),
                error: (error: { status?: number }) =>
                    this.recordMetrics(
                        request,
                        response,
                        Number(process.hrtime.bigint() - startTime),
                        error.status || 500,
                    ),
            }),
            finalize(() => this.metricsService.decGauge('http_active_requests')),
        );
    }

    private recordMetrics(request: Request, response: Response, durationNs: number, status?: number): void {
        const method = request.method;
        const path = this.normalizePath(request.route?.path || request.path);
        const statusCode = status ?? response.statusCode;
        this.metricsService.recordHttpRequest(method, path, statusCode, durationNs / 1e9);

        const requestSize = Number.parseInt(String(request.headers['content-length'] ?? '0'), 10) || 0;
        const responseSize = Number.parseInt(String(response.get('content-length') ?? '0'), 10) || 0;
        if (requestSize > 0)
            this.metricsService.observeHistogram('http_request_size_bytes', requestSize, { method, path });
        if (responseSize > 0)
            this.metricsService.observeHistogram('http_response_size_bytes', responseSize, { method, path });
    }

    private normalizePath(path: string): string {
        return path
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
            .replace(/\/\d+/g, '/:id');
    }
}
