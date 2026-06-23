import { AsyncLocalStorage } from 'node:async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor, OnModuleDestroy } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LogEvent } from 'kysely';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import {
    attachCorrelationIdHeader,
    attachRequestIdHeader,
    getOrCreateCorrelationId,
    getOrCreateRequestId,
} from '@a3s-lab/http';

export const trackingStorage = new AsyncLocalStorage<TrackingContext>();

export interface TrackingContext {
    requestId: string;
    correlationId?: string;
    userId?: string;
    organizationId?: string;
    startTime: number;
}

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request & { user?: Record<string, unknown> }>();
        const response = context.switchToHttp().getResponse<Response>();

        const requestId = getOrCreateRequestId(request);
        const correlationId = getOrCreateCorrelationId(request, requestId);
        attachRequestIdHeader(response, requestId);
        attachCorrelationIdHeader(response, correlationId);

        const user = request.user ?? {};
        const trackingContext: TrackingContext = {
            requestId,
            correlationId,
            userId: firstString(user.id, user.sub),
            organizationId: firstString(user.organizationId),
            startTime: Date.now(),
        };

        return new Observable(subscriber =>
            trackingStorage.run(trackingContext, () =>
                sqlQueryCollectorStorage.run([], () =>
                    externalCallCollectorStorage.run([], () => next.handle().subscribe(subscriber)),
                ),
            ),
        );
    }
}

export function getTrackingContext(): TrackingContext | undefined {
    return trackingStorage.getStore();
}

export function getRequestId(): string | undefined {
    return trackingStorage.getStore()?.requestId;
}

export function getCorrelationId(): string | undefined {
    return trackingStorage.getStore()?.correlationId;
}

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        const first = Array.isArray(value) ? value[0] : value;
        if (typeof first === 'string' && first.trim()) {
            return first;
        }
    }
    return undefined;
}

export interface RecordedSql {
    sql: string;
    parameters: unknown[];
    durationMs: number;
    error?: string;
    timestamp: number;
    truncated?: boolean;
}

export interface SqlQueryCollectorOptions {
    maxQueriesPerRequest: number;
    maxSqlLengthBytes: number;
}

const DEFAULT_SQL_COLLECTOR_OPTIONS: SqlQueryCollectorOptions = {
    maxQueriesPerRequest: 100,
    maxSqlLengthBytes: 2048,
};

let sqlCollectorOptions: SqlQueryCollectorOptions = { ...DEFAULT_SQL_COLLECTOR_OPTIONS };

export function configureSqlQueryCollector(options: Partial<SqlQueryCollectorOptions>): void {
    sqlCollectorOptions = { ...DEFAULT_SQL_COLLECTOR_OPTIONS, ...options };
}

export const sqlQueryCollectorStorage = new AsyncLocalStorage<RecordedSql[]>();

export function getRecordedSqls(): RecordedSql[] | null {
    return sqlQueryCollectorStorage.getStore() ?? null;
}

export function getRecordedSqlsOrEmpty(): RecordedSql[] {
    return sqlQueryCollectorStorage.getStore() ?? [];
}

export function recordSql(event: LogEvent): void {
    const store = sqlQueryCollectorStorage.getStore();
    if (!store || store.length >= sqlCollectorOptions.maxQueriesPerRequest) {
        return;
    }

    const sql = event.query.sql;
    const truncated = sql.length > sqlCollectorOptions.maxSqlLengthBytes;
    const safeSql = truncated ? `${sql.slice(0, sqlCollectorOptions.maxSqlLengthBytes)}...[truncated]` : sql;

    store.push({
        sql: safeSql,
        parameters: event.query.parameters ? event.query.parameters.map(serializeParameter) : [],
        durationMs: Number.isFinite(event.queryDurationMillis) ? event.queryDurationMillis : 0,
        error:
            event.level === 'error'
                ? event.error instanceof Error
                    ? event.error.message
                    : String(event.error)
                : undefined,
        timestamp: Date.now(),
        truncated: truncated || undefined,
    });
}

function serializeParameter(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return `<binary ${value.byteLength}B>`;
    try {
        return JSON.parse(JSON.stringify(value)) as unknown;
    } catch {
        return String(value);
    }
}

export interface RecordedSqlPatternSummary {
    pattern: string;
    count: number;
    totalMs: number;
    sampleIndex: number;
    nPlusOneSuspect: boolean;
}

export function normalizeSqlPattern(sql: string): string {
    return sql
        .replace(/\s+/g, ' ')
        .replace(/\$\d+/g, '$?')
        .replace(/\bIN\s*\((?:\s*\$\?\s*,?\s*)+\)/gi, 'IN ($?)')
        .replace(/'(?:[^']|'')*'/g, "'?'")
        .replace(/\b\d+\b/g, '?')
        .trim()
        .slice(0, 240);
}

export function summarizeSqlPatterns(sqls: RecordedSql[], nPlusOneThreshold = 3): RecordedSqlPatternSummary[] {
    const map = new Map<string, { count: number; totalMs: number; sampleIndex: number }>();
    sqls.forEach((entry, index) => {
        const pattern = normalizeSqlPattern(entry.sql);
        const existing = map.get(pattern);
        if (existing) {
            existing.count += 1;
            existing.totalMs += entry.durationMs;
        } else {
            map.set(pattern, { count: 1, totalMs: entry.durationMs, sampleIndex: index });
        }
    });
    return [...map.entries()]
        .map(([pattern, value]) => ({
            pattern,
            count: value.count,
            totalMs: Number(value.totalMs.toFixed(3)),
            sampleIndex: value.sampleIndex,
            nPlusOneSuspect: value.count >= nPlusOneThreshold,
        }))
        .sort((a, b) => b.count - a.count || b.totalMs - a.totalMs);
}

export type ExternalCallKind = 'http' | 'db' | 'redis' | 's3' | 'queue' | 'cache' | 'custom';

export interface RecordedExternalCall {
    kind: ExternalCallKind;
    target: string;
    op: string;
    durationMs: number;
    error?: string;
    timestamp: number;
}

export interface ExternalCallCollectorOptions {
    maxEntriesPerRequest: number;
    maxTargetLength: number;
    maxOpLength: number;
    maxErrorLength: number;
}

const DEFAULT_EXTERNAL_CALL_OPTIONS: ExternalCallCollectorOptions = {
    maxEntriesPerRequest: 200,
    maxTargetLength: 256,
    maxOpLength: 64,
    maxErrorLength: 200,
};

let externalCallOptions: ExternalCallCollectorOptions = { ...DEFAULT_EXTERNAL_CALL_OPTIONS };
export const externalCallCollectorStorage = new AsyncLocalStorage<RecordedExternalCall[]>();

export function configureExternalCallCollector(options: Partial<ExternalCallCollectorOptions>): void {
    externalCallOptions = { ...DEFAULT_EXTERNAL_CALL_OPTIONS, ...options };
}

export function getRecordedExternalCalls(): RecordedExternalCall[] | null {
    return externalCallCollectorStorage.getStore() ?? null;
}

export function getRecordedExternalCallsOrEmpty(): RecordedExternalCall[] {
    return externalCallCollectorStorage.getStore() ?? [];
}

export function recordExternalCall(input: {
    kind: ExternalCallKind;
    target: string;
    op: string;
    durationMs: number;
    error?: unknown;
}): void {
    const store = externalCallCollectorStorage.getStore();
    if (!store || store.length >= externalCallOptions.maxEntriesPerRequest) {
        return;
    }
    store.push({
        kind: input.kind,
        target: clip(String(input.target ?? ''), externalCallOptions.maxTargetLength),
        op: clip(String(input.op ?? ''), externalCallOptions.maxOpLength),
        durationMs: Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs) : 0,
        error: serializeError(input.error, externalCallOptions.maxErrorLength),
        timestamp: Date.now(),
    });
}

export async function traceExternalCall<T>(
    input: { kind: ExternalCallKind; target: string; op: string },
    fn: () => Promise<T>,
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        recordExternalCall({ ...input, durationMs: Date.now() - start });
        return result;
    } catch (error) {
        recordExternalCall({ ...input, durationMs: Date.now() - start, error });
        throw error;
    }
}

function clip(value: string, max: number): string {
    return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function serializeError(error: unknown, max: number): string | undefined {
    if (error === undefined || error === null) return undefined;
    if (error instanceof Error) return clip(error.message || error.name || 'Error', max);
    return clip(String(error), max);
}

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
