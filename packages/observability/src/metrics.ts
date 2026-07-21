import {
    CallHandler,
    Controller,
    DynamicModule,
    ExecutionContext,
    Get,
    Global,
    Header,
    Inject,
    Injectable,
    Module,
    NestInterceptor,
    OnModuleDestroy,
    Optional,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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

export interface MetricsOptions {
    maxSeriesPerMetric?: number;
    maxLabelValueLength?: number;
}

interface HistogramState {
    boundaries: number[];
    bucketCounts: number[];
    count: number;
    sum: number;
}

interface ParsedMetricKey {
    name: string;
    labels: Record<string, string>;
}

export const METRICS_OPTIONS = Symbol('METRICS_OPTIONS');
export const DEFAULT_METRICS_OPTIONS = Object.freeze({
    maxSeriesPerMetric: 1000,
    maxLabelValueLength: 200,
});
export const DEFAULT_HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
export const DEFAULT_SIZE_BUCKETS = [100, 1000, 10000, 100000, 1000000, 10000000];
export const UNKNOWN_HTTP_ROUTE = '__unmatched__';

const METRIC_NAME_PATTERN = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const LABEL_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const CARDINALITY_LABELS = { cardinality_limited: 'true' };

@Injectable()
export class MetricsService implements OnModuleDestroy {
    private readonly counters = new Map<string, number>();
    private readonly gauges = new Map<string, number>();
    private readonly histograms = new Map<string, HistogramState>();
    private readonly counterDefs = new Map<string, CounterMetric>();
    private readonly gaugeDefs = new Map<string, GaugeMetric>();
    private readonly histogramDefs = new Map<string, HistogramMetric>();
    private readonly seriesCounts = new Map<string, number>();
    private readonly maxSeriesPerMetric: number;
    private readonly maxLabelValueLength: number;

    constructor(
        @Optional()
        @Inject(METRICS_OPTIONS)
        options: MetricsOptions = {},
    ) {
        this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? DEFAULT_METRICS_OPTIONS.maxSeriesPerMetric;
        this.maxLabelValueLength = options.maxLabelValueLength ?? DEFAULT_METRICS_OPTIONS.maxLabelValueLength;
        assertPositiveSafeInteger(this.maxSeriesPerMetric, 'maxSeriesPerMetric');
        assertPositiveSafeInteger(this.maxLabelValueLength, 'maxLabelValueLength');

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
        this.assertMetricDefinition(metric.name, 'counter');
        this.counterDefs.set(metric.name, metric);
        const key = this.allocateSeriesKey(metric.name, undefined, this.counters);
        if (key !== undefined && !this.counters.has(key)) this.counters.set(key, 0);
    }

    registerGauge(metric: GaugeMetric): void {
        this.assertMetricDefinition(metric.name, 'gauge');
        this.gaugeDefs.set(metric.name, metric);
        const key = this.allocateSeriesKey(metric.name, undefined, this.gauges);
        if (key !== undefined && !this.gauges.has(key)) this.gauges.set(key, 0);
    }

    registerHistogram(metric: HistogramMetric): void {
        this.assertMetricDefinition(metric.name, 'histogram');
        const buckets = normalizeBuckets(metric.buckets ?? DEFAULT_HISTOGRAM_BUCKETS);
        const current = this.histogramDefs.get(metric.name);
        if (current && !sameBuckets(current.buckets ?? DEFAULT_HISTOGRAM_BUCKETS, buckets)) {
            const hasObservations = [...this.histograms.keys()].some(key => this.parseKey(key).name === metric.name);
            if (hasObservations) {
                throw new Error(`cannot change buckets after observing histogram ${metric.name}`);
            }
        }
        this.histogramDefs.set(metric.name, { ...metric, buckets });
    }

    incCounter(name: string, labels?: Record<string, string>, value = 1): void {
        assertFiniteNumber(value, 'counter increment');
        if (value < 0) throw new RangeError('counter increment must not be negative');
        const key = this.allocateSeriesKey(name, labels, this.counters);
        if (key !== undefined) this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    }

    getCounter(name: string, labels?: Record<string, string>): number {
        return this.counters.get(this.createKey(name, labels)) ?? 0;
    }

    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        assertFiniteNumber(value, 'gauge value');
        const key = this.allocateSeriesKey(name, labels, this.gauges);
        if (key !== undefined) this.gauges.set(key, value);
    }

    incGauge(name: string, labels?: Record<string, string>, value = 1): void {
        assertFiniteNumber(value, 'gauge increment');
        const key = this.allocateSeriesKey(name, labels, this.gauges);
        if (key !== undefined) this.gauges.set(key, (this.gauges.get(key) ?? 0) + value);
    }

    decGauge(name: string, labels?: Record<string, string>, value = 1): void {
        this.incGauge(name, labels, -value);
    }

    getGauge(name: string, labels?: Record<string, string>): number {
        return this.gauges.get(this.createKey(name, labels)) ?? 0;
    }

    observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
        assertFiniteNumber(value, 'histogram observation');
        if (labels?.le !== undefined) throw new Error('histogram labels must not define the reserved le label');
        const key = this.allocateSeriesKey(name, labels, this.histograms);
        if (key === undefined) return;

        let state = this.histograms.get(key);
        if (!state) {
            const boundaries = normalizeBuckets(this.histogramDefs.get(name)?.buckets ?? DEFAULT_HISTOGRAM_BUCKETS);
            state = { boundaries, bucketCounts: boundaries.map(() => 0), count: 0, sum: 0 };
            this.histograms.set(key, state);
        }
        state.count += 1;
        state.sum += value;
        for (const [index, boundary] of state.boundaries.entries()) {
            if (value <= boundary) state.bucketCounts[index] += 1;
        }
    }

    recordHttpRequest(method: string, path: string, statusCode: number, durationSeconds: number): void {
        const labels = { method, path, status: String(statusCode) };
        this.incCounter('http_requests_total', labels);
        if (statusCode >= 400) this.incCounter('http_errors_total', labels);
        this.observeHistogram('http_request_duration_seconds', durationSeconds, { method, path });
    }

    toJSON(): Record<string, unknown> {
        return {
            counters: this.numericSeriesToJSON(this.counters),
            gauges: this.numericSeriesToJSON(this.gauges),
            histograms: Object.fromEntries(
                [...this.histograms].map(([key, state]) => [
                    this.displayKey(key),
                    {
                        buckets: Object.fromEntries([
                            ...state.boundaries.map((boundary, index) => [String(boundary), state.bucketCounts[index]]),
                            ['+Inf', state.count],
                        ]),
                        count: state.count,
                        sum: state.sum,
                    },
                ]),
            ),
        };
    }

    toPrometheusFormat(): string {
        const lines: string[] = [];
        const emittedTypes = new Set<string>();
        for (const [key, value] of this.counters) {
            const parsed = this.parseKey(key);
            this.addDefinition(lines, emittedTypes, parsed.name, 'counter', this.counterDefs.get(parsed.name));
            lines.push(`${parsed.name}${formatLabels(parsed.labels)} ${value}`);
        }
        for (const [key, value] of this.gauges) {
            const parsed = this.parseKey(key);
            this.addDefinition(lines, emittedTypes, parsed.name, 'gauge', this.gaugeDefs.get(parsed.name));
            lines.push(`${parsed.name}${formatLabels(parsed.labels)} ${value}`);
        }
        for (const [key, state] of this.histograms) {
            const parsed = this.parseKey(key);
            this.addDefinition(lines, emittedTypes, parsed.name, 'histogram', this.histogramDefs.get(parsed.name));
            for (const [index, boundary] of state.boundaries.entries()) {
                lines.push(
                    `${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: String(boundary) })} ${state.bucketCounts[index]}`,
                );
            }
            lines.push(`${parsed.name}_bucket${formatLabels({ ...parsed.labels, le: '+Inf' })} ${state.count}`);
            lines.push(`${parsed.name}_count${formatLabels(parsed.labels)} ${state.count}`);
            lines.push(`${parsed.name}_sum${formatLabels(parsed.labels)} ${state.sum}`);
        }
        return `${lines.join('\n')}\n`;
    }

    onModuleDestroy(): void {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.seriesCounts.clear();
    }

    private allocateSeriesKey<T>(
        name: string,
        labels: Record<string, string> | undefined,
        store: Map<string, T>,
    ): string | undefined {
        assertMetricName(name);
        const key = this.createKey(name, labels);
        if (store.has(key)) return key;

        const currentCount = this.seriesCounts.get(name) ?? 0;
        const overflowKey = this.createKey(name, CARDINALITY_LABELS);
        if (currentCount < this.maxSeriesPerMetric - 1 || Object.keys(labels ?? {}).length === 0) {
            if (currentCount >= this.maxSeriesPerMetric) return store.has(overflowKey) ? overflowKey : undefined;
            this.seriesCounts.set(name, currentCount + 1);
            return key;
        }
        if (store.has(overflowKey)) return overflowKey;
        if (currentCount < this.maxSeriesPerMetric) {
            this.seriesCounts.set(name, currentCount + 1);
            return overflowKey;
        }
        return undefined;
    }

    private createKey(name: string, labels?: Record<string, string>): string {
        assertMetricName(name);
        const entries = Object.entries(labels ?? {})
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
                if (!LABEL_NAME_PATTERN.test(key)) throw new TypeError(`invalid metric label name: ${key}`);
                const stringValue = String(value);
                return [
                    key,
                    stringValue.length <= this.maxLabelValueLength ? stringValue : '__label_value_too_long__',
                ] as const;
            })
            .sort(([left], [right]) => left.localeCompare(right));
        return `${name}\0${JSON.stringify(entries)}`;
    }

    private parseKey(key: string): ParsedMetricKey {
        const separator = key.indexOf('\0');
        if (separator < 0) throw new Error('invalid internal metric key');
        const entries = JSON.parse(key.slice(separator + 1)) as Array<[string, string]>;
        return { name: key.slice(0, separator), labels: Object.fromEntries(entries) };
    }

    private displayKey(key: string): string {
        const parsed = this.parseKey(key);
        const entries = Object.entries(parsed.labels);
        if (entries.length === 0) return parsed.name;
        return `${parsed.name}{${entries.map(([name, value]) => `${name}=${escapeStorageKey(value)}`).join(',')}}`;
    }

    private numericSeriesToJSON(series: Map<string, number>): Record<string, number> {
        return Object.fromEntries([...series].map(([key, value]) => [this.displayKey(key), value]));
    }

    private assertMetricDefinition(name: string, type: 'counter' | 'gauge' | 'histogram'): void {
        assertMetricName(name);
        const conflictingType =
            (type !== 'counter' && this.counterDefs.has(name) && 'counter') ||
            (type !== 'gauge' && this.gaugeDefs.has(name) && 'gauge') ||
            (type !== 'histogram' && this.histogramDefs.has(name) && 'histogram');
        if (conflictingType) throw new Error(`metric ${name} is already registered as ${conflictingType}`);
    }

    private addDefinition(
        lines: string[],
        emittedTypes: Set<string>,
        name: string,
        type: 'counter' | 'gauge' | 'histogram',
        definition?: { help: string },
    ): void {
        if (!definition || emittedTypes.has(name)) return;
        lines.push(`# HELP ${name} ${definition.help}`, `# TYPE ${name} ${type}`);
        emittedTypes.add(name);
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

function escapeStorageKey(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/=/g, '\\=').replace(/[{}]/g, '_');
}

function assertMetricName(name: string): void {
    if (!METRIC_NAME_PATTERN.test(name)) throw new TypeError(`invalid metric name: ${name}`);
}

function assertPositiveSafeInteger(value: number, name: string): void {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${name} must be a positive safe integer`);
}

function assertFiniteNumber(value: number, name: string): void {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function normalizeBuckets(buckets: readonly number[]): number[] {
    if (buckets.length === 0) throw new RangeError('histogram buckets must not be empty');
    const normalized = [...new Set(buckets)];
    for (const bucket of normalized) assertFiniteNumber(bucket, 'histogram bucket');
    return normalized.sort((left, right) => left - right);
}

function sameBuckets(left: readonly number[], right: readonly number[]): boolean {
    const normalizedLeft = normalizeBuckets(left);
    const normalizedRight = normalizeBuckets(right);
    return (
        normalizedLeft.length === normalizedRight.length &&
        normalizedLeft.every((boundary, index) => boundary === normalizedRight[index])
    );
}

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-Type', 'text/plain')
    getMetrics(): string {
        return this.metricsService.toPrometheusFormat();
    }

    @Get('json')
    getMetricsJson(): Record<string, unknown> {
        return this.metricsService.toJSON();
    }
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const startTime = process.hrtime.bigint();
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        let errorStatus: number | undefined;
        this.metricsService.incGauge('http_active_requests');

        return next.handle().pipe(
            tap({ error: (error: { status?: number }) => (errorStatus = error.status || 500) }),
            finalize(() => {
                try {
                    this.recordMetrics(request, response, Number(process.hrtime.bigint() - startTime), errorStatus);
                } finally {
                    this.metricsService.decGauge('http_active_requests');
                }
            }),
        );
    }

    private recordMetrics(request: Request, response: Response, durationNs: number, status?: number): void {
        const method = request.method;
        const path = resolveHttpRouteTemplate(request);
        const statusCode = status ?? response.statusCode;
        this.metricsService.recordHttpRequest(method, path, statusCode, durationNs / 1e9);

        const requestSize = Number.parseInt(String(request.headers['content-length'] ?? '0'), 10) || 0;
        const responseSize = Number.parseInt(String(response.get('content-length') ?? '0'), 10) || 0;
        if (requestSize > 0)
            this.metricsService.observeHistogram('http_request_size_bytes', requestSize, { method, path });
        if (responseSize > 0)
            this.metricsService.observeHistogram('http_response_size_bytes', responseSize, { method, path });
    }
}

export function resolveHttpRouteTemplate(request: Pick<Request, 'baseUrl' | 'route'>): string {
    const routePath = (request.route as { path?: unknown } | undefined)?.path;
    if (typeof routePath !== 'string' || routePath.length === 0) return UNKNOWN_HTTP_ROUTE;
    const baseUrl = typeof request.baseUrl === 'string' ? request.baseUrl : '';
    const combined = `${baseUrl}/${routePath}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    return combined.startsWith('/') ? combined : `/${combined}`;
}

@Global()
@Module({
    controllers: [MetricsController],
    providers: [
        { provide: METRICS_OPTIONS, useValue: {} },
        MetricsService,
        { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    ],
    exports: [MetricsService],
})
export class MetricsModule {
    static register(options: MetricsOptions = {}): DynamicModule {
        return {
            module: MetricsModule,
            providers: [{ provide: METRICS_OPTIONS, useValue: options }],
        };
    }
}
