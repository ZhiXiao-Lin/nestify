import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
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
import { defer, Observable } from 'rxjs';
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
    buckets?: readonly number[];
}

export interface MetricsOptions {
    maxSeriesPerMetric?: number;
    maxLabelValueLength?: number;
    maxMetrics?: number;
}

export interface MetricsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider<MetricsOptions>['inject'];
    useFactory: (...args: any[]) => MetricsOptions | Promise<MetricsOptions>;
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
    maxMetrics: 1000,
});
export const DEFAULT_HISTOGRAM_BUCKETS: readonly number[] = Object.freeze([
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
]);
export const DEFAULT_SIZE_BUCKETS: readonly number[] = Object.freeze([100, 1000, 10000, 100000, 1000000, 10000000]);
export const UNKNOWN_HTTP_ROUTE = '__unmatched__';

const METRIC_NAME_PATTERN = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const LABEL_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const CARDINALITY_LABELS = { cardinality_limited: 'true' };
const RESERVED_CARDINALITY_LABEL = 'cardinality_limited';
const MAX_METRICS = 100_000;
const MAX_SERIES_PER_METRIC = 100_000;
const MAX_LABEL_VALUE_LENGTH = 4096;
const MAX_METRIC_NAME_LENGTH = 200;
const MAX_LABEL_NAME_LENGTH = 128;
const MAX_LABELS_PER_SERIES = 32;
const MAX_HELP_LENGTH = 1024;
const MAX_HTTP_ROUTE_LENGTH = 512;

@Injectable()
export class MetricsService implements OnModuleDestroy {
    private readonly counters = new Map<string, number>();
    private readonly gauges = new Map<string, number>();
    private readonly histograms = new Map<string, HistogramState>();
    private readonly counterDefs = new Map<string, CounterMetric>();
    private readonly gaugeDefs = new Map<string, GaugeMetric>();
    private readonly histogramDefs = new Map<string, HistogramMetric>();
    private readonly seriesCounts = new Map<string, number>();
    private readonly metricTypes = new Map<string, 'counter' | 'gauge' | 'histogram'>();
    private readonly maxSeriesPerMetric: number;
    private readonly maxLabelValueLength: number;
    private readonly maxMetrics: number;

    constructor(
        @Optional()
        @Inject(METRICS_OPTIONS)
        options: MetricsOptions = {},
    ) {
        if (!isRecord(options)) throw new TypeError('metrics options must be an object');
        this.maxSeriesPerMetric = options.maxSeriesPerMetric ?? DEFAULT_METRICS_OPTIONS.maxSeriesPerMetric;
        this.maxLabelValueLength = options.maxLabelValueLength ?? DEFAULT_METRICS_OPTIONS.maxLabelValueLength;
        this.maxMetrics = options.maxMetrics ?? DEFAULT_METRICS_OPTIONS.maxMetrics;
        assertIntegerInRange(this.maxSeriesPerMetric, 'maxSeriesPerMetric', 2, MAX_SERIES_PER_METRIC);
        assertIntegerInRange(this.maxLabelValueLength, 'maxLabelValueLength', 1, MAX_LABEL_VALUE_LENGTH);
        assertIntegerInRange(this.maxMetrics, 'maxMetrics', 6, MAX_METRICS);

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
        const definition = normalizeMetricDefinition(metric);
        this.assertMetricDefinition(definition.name, 'counter');
        const current = this.counterDefs.get(definition.name);
        if (current && current.help !== definition.help) {
            throw new Error(`cannot change help after registering counter ${definition.name}`);
        }
        this.counterDefs.set(definition.name, Object.freeze(definition));
        const key = this.allocateSeriesKey(definition.name, undefined, this.counters);
        if (key !== undefined && !this.counters.has(key)) this.counters.set(key, 0);
    }

    registerGauge(metric: GaugeMetric): void {
        const definition = normalizeMetricDefinition(metric);
        this.assertMetricDefinition(definition.name, 'gauge');
        const current = this.gaugeDefs.get(definition.name);
        if (current && current.help !== definition.help) {
            throw new Error(`cannot change help after registering gauge ${definition.name}`);
        }
        this.gaugeDefs.set(definition.name, Object.freeze(definition));
        const key = this.allocateSeriesKey(definition.name, undefined, this.gauges);
        if (key !== undefined && !this.gauges.has(key)) this.gauges.set(key, 0);
    }

    registerHistogram(metric: HistogramMetric): void {
        const definition = normalizeMetricDefinition(metric);
        this.assertMetricDefinition(definition.name, 'histogram');
        const buckets = normalizeBuckets(metric.buckets ?? DEFAULT_HISTOGRAM_BUCKETS);
        const current = this.histogramDefs.get(definition.name);
        if (current && current.help !== definition.help) {
            throw new Error(`cannot change help after registering histogram ${definition.name}`);
        }
        const observedStates = [...this.histograms.entries()]
            .filter(([key]) => this.parseKey(key).name === definition.name)
            .map(([, state]) => state);
        if (current && !sameBuckets(current.buckets ?? DEFAULT_HISTOGRAM_BUCKETS, buckets)) {
            if (observedStates.length > 0) {
                throw new Error(`cannot change buckets after observing histogram ${definition.name}`);
            }
        }
        if (observedStates.some(state => !sameBuckets(state.boundaries, buckets))) {
            throw new Error(`cannot register buckets that differ from existing observations for ${definition.name}`);
        }
        this.histogramDefs.set(definition.name, Object.freeze({ ...definition, buckets: Object.freeze(buckets) }));
    }

    incCounter(name: string, labels?: Record<string, string>, value = 1): void {
        assertFiniteNumber(value, 'counter increment');
        if (value < 0) throw new RangeError('counter increment must not be negative');
        this.claimMetric(name, 'counter');
        const key = this.allocateSeriesKey(name, labels, this.counters);
        if (key !== undefined) {
            this.counters.set(key, addFinite(this.counters.get(key) ?? 0, value, `counter ${name}`));
        }
    }

    getCounter(name: string, labels?: Record<string, string>): number {
        return this.counters.get(this.createKey(name, labels)) ?? 0;
    }

    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        assertFiniteNumber(value, 'gauge value');
        this.claimMetric(name, 'gauge');
        const key = this.allocateSeriesKey(name, labels, this.gauges);
        if (key !== undefined) this.gauges.set(key, value);
    }

    incGauge(name: string, labels?: Record<string, string>, value = 1): void {
        assertFiniteNumber(value, 'gauge increment');
        this.claimMetric(name, 'gauge');
        const key = this.allocateSeriesKey(name, labels, this.gauges);
        if (key !== undefined) {
            this.gauges.set(key, addFinite(this.gauges.get(key) ?? 0, value, `gauge ${name}`));
        }
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
        this.claimMetric(name, 'histogram');
        const key = this.allocateSeriesKey(name, labels, this.histograms);
        if (key === undefined) return;

        let state = this.histograms.get(key);
        if (!state) {
            const boundaries = normalizeBuckets(this.histogramDefs.get(name)?.buckets ?? DEFAULT_HISTOGRAM_BUCKETS);
            state = { boundaries, bucketCounts: boundaries.map(() => 0), count: 0, sum: 0 };
            this.histograms.set(key, state);
        }
        if (state.count >= Number.MAX_SAFE_INTEGER)
            throw new RangeError(`histogram ${name} observation count overflow`);
        state.count += 1;
        state.sum = addFinite(state.sum, value, `histogram ${name} sum`);
        for (const [index, boundary] of state.boundaries.entries()) {
            if (value <= boundary) state.bucketCounts[index] += 1;
        }
    }

    recordHttpRequest(method: string, path: string, statusCode: number, durationSeconds: number): void {
        const labels = {
            method: normalizeHttpMethod(method),
            path: normalizeHttpPath(path),
            status: String(normalizeHttpStatus(statusCode)),
        };
        assertFiniteNumber(durationSeconds, 'HTTP request duration');
        if (durationSeconds < 0) throw new RangeError('HTTP request duration must not be negative');
        this.incCounter('http_requests_total', labels);
        if (Number(labels.status) >= 400) this.incCounter('http_errors_total', labels);
        this.observeHistogram('http_request_duration_seconds', durationSeconds, {
            method: labels.method,
            path: labels.path,
        });
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
        const overflowKey = this.createKey(name, CARDINALITY_LABELS, true);
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

    private createKey(name: string, labels?: Record<string, string>, allowReservedLabels = false): string {
        assertMetricName(name);
        const rawEntries = Object.entries(labels ?? {});
        if (rawEntries.length > MAX_LABELS_PER_SERIES) {
            throw new RangeError(`metric series must not define more than ${MAX_LABELS_PER_SERIES} labels`);
        }
        const entries = rawEntries
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
                assertLabelName(key);
                if (!allowReservedLabels && key === RESERVED_CARDINALITY_LABEL) {
                    throw new TypeError(`${RESERVED_CARDINALITY_LABEL} is reserved for cardinality aggregation`);
                }
                if (typeof value !== 'string') throw new TypeError(`metric label ${key} must be a string`);
                return [key, value.length <= this.maxLabelValueLength ? value : '__label_value_too_long__'] as const;
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
        this.claimMetric(name, type);
    }

    private claimMetric(name: string, type: 'counter' | 'gauge' | 'histogram'): void {
        assertMetricName(name);
        const currentType = this.metricTypes.get(name);
        if (currentType && currentType !== type) {
            throw new Error(`metric ${name} is already registered as ${currentType}`);
        }
        if (!currentType) {
            if (this.metricTypes.size >= this.maxMetrics) {
                throw new RangeError(`metric capacity of ${this.maxMetrics} has been reached`);
            }
            this.metricTypes.set(name, type);
        }
    }

    private addDefinition(
        lines: string[],
        emittedTypes: Set<string>,
        name: string,
        type: 'counter' | 'gauge' | 'histogram',
        definition?: { help: string },
    ): void {
        if (!definition || emittedTypes.has(name)) return;
        lines.push(`# HELP ${name} ${escapeHelp(definition.help)}`, `# TYPE ${name} ${type}`);
        emittedTypes.add(name);
    }
}

function formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) return '';
    return `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(',')}}`;
}

function escapeLabel(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r\n|\r|\n/g, '\\n');
}

function escapeHelp(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n');
}

function escapeStorageKey(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/=/g, '\\=').replace(/[{}]/g, '_');
}

function assertMetricName(name: string): void {
    if (typeof name !== 'string' || name.length > MAX_METRIC_NAME_LENGTH || !METRIC_NAME_PATTERN.test(name)) {
        throw new TypeError(`invalid metric name: ${String(name).slice(0, MAX_METRIC_NAME_LENGTH)}`);
    }
}

function assertLabelName(name: string): void {
    if (name.length > MAX_LABEL_NAME_LENGTH || !LABEL_NAME_PATTERN.test(name)) {
        throw new TypeError(`invalid metric label name: ${name.slice(0, MAX_LABEL_NAME_LENGTH)}`);
    }
}

function normalizeMetricDefinition<T extends CounterMetric | GaugeMetric>(metric: T): T;
function normalizeMetricDefinition(metric: HistogramMetric): Pick<HistogramMetric, 'name' | 'help'>;
function normalizeMetricDefinition(metric: CounterMetric | GaugeMetric | HistogramMetric): {
    name: string;
    help: string;
} {
    if (!metric || typeof metric !== 'object') throw new TypeError('metric definition must be an object');
    assertMetricName(metric.name);
    if (typeof metric.help !== 'string') throw new TypeError(`metric ${metric.name} help must be a string`);
    const help = metric.help.trim();
    if (!help) throw new TypeError(`metric ${metric.name} help must not be empty`);
    if (help.length > MAX_HELP_LENGTH) {
        throw new RangeError(`metric ${metric.name} help must not exceed ${MAX_HELP_LENGTH} characters`);
    }
    return { name: metric.name, help };
}

function assertIntegerInRange(value: number, name: string, minimum: number, maximum: number): void {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(`${name} must be a safe integer between ${minimum} and ${maximum}`);
    }
}

function assertFiniteNumber(value: number, name: string): void {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

function addFinite(left: number, right: number, name: string): number {
    const value = left + right;
    if (!Number.isFinite(value)) throw new RangeError(`${name} overflowed the finite number range`);
    return value;
}

function normalizeBuckets(buckets: readonly number[]): number[] {
    if (!Array.isArray(buckets)) throw new TypeError('histogram buckets must be an array');
    if (buckets.length === 0) throw new RangeError('histogram buckets must not be empty');
    if (buckets.length > 1000) throw new RangeError('histogram buckets must not contain more than 1000 values');
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

function normalizeHttpMethod(method: string): string {
    if (typeof method !== 'string') throw new TypeError('HTTP method must be a string');
    const normalized = method.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9-]{0,31}$/.test(normalized)) throw new TypeError('HTTP method is invalid');
    return normalized;
}

function normalizeHttpPath(path: string): string {
    if (typeof path !== 'string') return UNKNOWN_HTTP_ROUTE;
    if (path === UNKNOWN_HTTP_ROUTE) return UNKNOWN_HTTP_ROUTE;
    const normalized = path.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (
        !normalized ||
        normalized.length > MAX_HTTP_ROUTE_LENGTH ||
        normalized.includes('?') ||
        normalized.includes('#')
    ) {
        return UNKNOWN_HTTP_ROUTE;
    }
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function normalizeHttpStatus(statusCode: number): number {
    if (!Number.isSafeInteger(statusCode) || statusCode < 100 || statusCode > 999) return 500;
    return statusCode;
}

function getHttpErrorStatus(error: unknown): number {
    if (!isRecord(error)) return 500;
    for (const key of ['status', 'statusCode']) {
        const descriptor = Object.getOwnPropertyDescriptor(error, key);
        if (descriptor && 'value' in descriptor && typeof descriptor.value === 'number') {
            return normalizeHttpStatus(descriptor.value);
        }
    }
    return 500;
}

function parseContentLength(value: unknown): number {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (typeof candidate === 'number') {
        return Number.isSafeInteger(candidate) && candidate > 0 ? candidate : 0;
    }
    if (typeof candidate !== 'string' || !/^(?:0|[1-9]\d*)$/.test(candidate.trim())) return 0;
    const parsed = Number(candidate);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
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
        if (typeof context.getType === 'function' && context.getType() !== 'http') return next.handle();

        return defer(() => {
            const startTime = process.hrtime.bigint();
            const request = context.switchToHttp().getRequest<Request>();
            const response = context.switchToHttp().getResponse<Response>();
            let errorStatus: number | undefined;
            try {
                this.metricsService.incGauge('http_active_requests');
            } catch {
                return next.handle();
            }

            const finish = () => {
                try {
                    this.recordMetrics(request, response, Number(process.hrtime.bigint() - startTime), errorStatus);
                } catch {
                    // Telemetry failures must not replace the application response.
                } finally {
                    try {
                        this.metricsService.decGauge('http_active_requests');
                    } catch {
                        // The request lifecycle must complete even if metric state is unavailable.
                    }
                }
            };

            let source: Observable<unknown>;
            try {
                source = next.handle();
            } catch (error) {
                errorStatus = getHttpErrorStatus(error);
                finish();
                throw error;
            }
            return source.pipe(tap({ error: error => (errorStatus = getHttpErrorStatus(error)) }), finalize(finish));
        });
    }

    private recordMetrics(request: Request, response: Response, durationNs: number, status?: number): void {
        const method = normalizeHttpMethod(request.method);
        const path = resolveHttpRouteTemplate(request);
        const statusCode = normalizeHttpStatus(status ?? response.statusCode);
        this.metricsService.recordHttpRequest(method, path, statusCode, durationNs / 1e9);

        const requestSize = parseContentLength(request.headers['content-length']);
        const responseSize = parseContentLength(response.get('content-length'));
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
    return normalizeHttpPath(combined);
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
        if (!isRecord(options)) throw new TypeError('metrics module options must be an object');
        return {
            module: MetricsModule,
            providers: [{ provide: METRICS_OPTIONS, useValue: Object.freeze({ ...options }) }],
        };
    }

    static registerAsync(options: MetricsModuleAsyncOptions): DynamicModule {
        if (!isRecord(options)) throw new TypeError('async metrics module options must be an object');
        if (typeof options.useFactory !== 'function') throw new TypeError('metrics useFactory must be a function');
        if (options.imports !== undefined && !Array.isArray(options.imports)) {
            throw new TypeError('metrics imports must be an array');
        }
        if (options.inject !== undefined && !Array.isArray(options.inject)) {
            throw new TypeError('metrics inject must be an array');
        }
        return {
            module: MetricsModule,
            imports: options.imports ? [...options.imports] : [],
            providers: [
                {
                    provide: METRICS_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: any[]) => {
                        const value = await options.useFactory(...args);
                        if (!isRecord(value)) throw new TypeError('metrics useFactory must return an options object');
                        return Object.freeze({ ...value });
                    },
                },
            ],
        };
    }
}
