import { AsyncLocalStorage } from 'node:async_hooks';
import { Buffer } from 'node:buffer';
import type { LogEvent } from 'kysely';

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
    maxParametersPerQuery?: number;
    maxParameterDepth?: number;
    maxParameterEntries?: number;
    maxParameterLengthBytes?: number;
    maxErrorLength?: number;
    captureRawSql?: boolean;
    captureParameters?: boolean;
    captureErrorDetails?: boolean;
}

export type NormalizedSqlQueryCollectorOptions = Required<SqlQueryCollectorOptions>;

const SQL_TRUNCATION_SUFFIX = '...[truncated]';
const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_PARAMETER_NAME =
    /(?:authorization|cookie|credential|pass(?:word)?|private[_-]?key|secret|session|token|api[_-]?key)/i;

export const DEFAULT_SQL_COLLECTOR_OPTIONS: Readonly<NormalizedSqlQueryCollectorOptions> = Object.freeze({
    maxQueriesPerRequest: 100,
    maxSqlLengthBytes: 2048,
    maxParametersPerQuery: 100,
    maxParameterDepth: 4,
    maxParameterEntries: 500,
    maxParameterLengthBytes: 512,
    maxErrorLength: 200,
    captureRawSql: false,
    captureParameters: false,
    captureErrorDetails: false,
});

let sqlCollectorOptions: Readonly<NormalizedSqlQueryCollectorOptions> = DEFAULT_SQL_COLLECTOR_OPTIONS;

export function configureSqlQueryCollector(options: Partial<SqlQueryCollectorOptions>): void {
    if (!isRecord(options)) throw new TypeError('SQL collector options must be an object');
    const next = { ...DEFAULT_SQL_COLLECTOR_OPTIONS, ...options };
    assertIntegerInRange(next.maxQueriesPerRequest, 'maxQueriesPerRequest', 1, 10_000);
    assertIntegerInRange(next.maxSqlLengthBytes, 'maxSqlLengthBytes', 16, 1_048_576);
    assertIntegerInRange(next.maxParametersPerQuery, 'maxParametersPerQuery', 0, 10_000);
    assertIntegerInRange(next.maxParameterDepth, 'maxParameterDepth', 0, 32);
    assertIntegerInRange(next.maxParameterEntries, 'maxParameterEntries', 1, 100_000);
    assertIntegerInRange(next.maxParameterLengthBytes, 'maxParameterLengthBytes', 16, 65_536);
    assertIntegerInRange(next.maxErrorLength, 'maxErrorLength', 16, 4096);
    if (typeof next.captureRawSql !== 'boolean') throw new TypeError('captureRawSql must be a boolean');
    if (typeof next.captureParameters !== 'boolean') throw new TypeError('captureParameters must be a boolean');
    if (typeof next.captureErrorDetails !== 'boolean') {
        throw new TypeError('captureErrorDetails must be a boolean');
    }
    sqlCollectorOptions = Object.freeze(next);
}

export function getSqlQueryCollectorOptions(): Readonly<NormalizedSqlQueryCollectorOptions> {
    return { ...sqlCollectorOptions };
}

export const sqlQueryCollectorStorage = new AsyncLocalStorage<RecordedSql[]>();

export function getRecordedSqls(): RecordedSql[] | null {
    const entries = sqlQueryCollectorStorage.getStore();
    return entries ? entries.map(cloneRecordedSql) : null;
}

export function getRecordedSqlsOrEmpty(): RecordedSql[] {
    return getRecordedSqls() ?? [];
}

export function recordSql(event: LogEvent): void {
    const store = sqlQueryCollectorStorage.getStore();
    if (!store || store.length >= sqlCollectorOptions.maxQueriesPerRequest) return;

    try {
        const sql = typeof event?.query?.sql === 'string' ? event.query.sql : '__invalid_sql__';
        const collectedSql = sqlCollectorOptions.captureRawSql ? sql : normalizeSqlPattern(sql);
        const truncatedSql = truncateUtf8(collectedSql, sqlCollectorOptions.maxSqlLengthBytes, SQL_TRUNCATION_SUFFIX);
        const parameters =
            sqlCollectorOptions.captureParameters && Array.isArray(event.query?.parameters)
                ? serializeParameters(event.query.parameters)
                : [];
        const durationMs =
            typeof event.queryDurationMillis === 'number' && Number.isFinite(event.queryDurationMillis)
                ? Math.max(0, event.queryDurationMillis)
                : 0;

        store.push({
            sql: truncatedSql.value,
            parameters,
            durationMs,
            error: event.level === 'error' ? serializeError(event.error) : undefined,
            timestamp: Date.now(),
            truncated: truncatedSql.truncated || undefined,
        });
    } catch {
        // Query logging must never change the outcome of the database operation it observes.
    }
}

function serializeParameters(parameters: readonly unknown[]): unknown[] {
    const limited = parameters.slice(0, sqlCollectorOptions.maxParametersPerQuery);
    const state: ParameterSerializationState = {
        entries: 0,
        seen: new WeakSet<object>(),
    };
    const serialized = limited.map(value => serializeParameter(value, state, 0));
    if (parameters.length > limited.length) {
        serialized.push(`<${parameters.length - limited.length} parameters omitted>`);
    }
    return serialized;
}

interface ParameterSerializationState {
    entries: number;
    seen: WeakSet<object>;
}

function serializeParameter(value: unknown, state: ParameterSerializationState, depth: number): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        return truncateUtf8(value, sqlCollectorOptions.maxParameterLengthBytes, SQL_TRUNCATION_SUFFIX).value;
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : '<non-finite number>';
    if (typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'symbol' || typeof value === 'function') return `<unsupported ${typeof value}>`;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '<invalid date>' : value.toISOString();
    if (value instanceof Uint8Array) return `<binary ${value.byteLength}B>`;
    if (value instanceof Error) return value.name || 'Error';
    if (typeof value !== 'object') return '<unsupported value>';
    if (depth >= sqlCollectorOptions.maxParameterDepth) return '<max depth>';
    if (state.entries >= sqlCollectorOptions.maxParameterEntries) return '<entry limit>';
    if (state.seen.has(value)) return '<circular or repeated>';
    state.seen.add(value);

    if (Array.isArray(value)) {
        const result: unknown[] = [];
        for (const entry of value) {
            if (state.entries >= sqlCollectorOptions.maxParameterEntries) {
                result.push('<entry limit>');
                break;
            }
            state.entries += 1;
            result.push(serializeParameter(entry, state, depth + 1));
        }
        return result;
    }

    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    let descriptors: PropertyDescriptorMap;
    try {
        descriptors = Object.getOwnPropertyDescriptors(value);
    } catch {
        return '<uninspectable object>';
    }
    for (const [rawKey, descriptor] of Object.entries(descriptors)) {
        if (state.entries >= sqlCollectorOptions.maxParameterEntries) {
            result.__truncated__ = '<entry limit>';
            break;
        }
        state.entries += 1;
        const key = truncateUtf8(rawKey, sqlCollectorOptions.maxParameterLengthBytes, SQL_TRUNCATION_SUFFIX).value;
        if (SENSITIVE_PARAMETER_NAME.test(rawKey)) {
            result[key] = REDACTED_VALUE;
        } else if ('value' in descriptor) {
            result[key] = serializeParameter(descriptor.value, state, depth + 1);
        } else {
            result[key] = '<accessor omitted>';
        }
    }
    return result;
}

function serializeError(error: unknown): string {
    if (!sqlCollectorOptions.captureErrorDetails) return error instanceof Error ? error.name || 'Error' : 'Error';
    const value = error instanceof Error ? error.message || error.name : typeof error === 'string' ? error : 'Error';
    return truncateUtf8(normalizeSingleLine(value), sqlCollectorOptions.maxErrorLength, SQL_TRUNCATION_SUFFIX).value;
}

export interface RecordedSqlPatternSummary {
    pattern: string;
    count: number;
    totalMs: number;
    sampleIndex: number;
    nPlusOneSuspect: boolean;
}

export function normalizeSqlPattern(sql: string): string {
    if (typeof sql !== 'string') throw new TypeError('SQL pattern input must be a string');
    return maskSqlLiteralsAndComments(sql.slice(0, 65_536))
        .replace(/\s+/g, ' ')
        .replace(/\bIN\s*\((?:\s*\$\?\s*,?\s*)+\)/gi, 'IN ($?)')
        .trim()
        .slice(0, 240);
}

export function summarizeSqlPatterns(sqls: readonly RecordedSql[], nPlusOneThreshold = 3): RecordedSqlPatternSummary[] {
    if (!Array.isArray(sqls)) throw new TypeError('SQL records must be an array');
    assertIntegerInRange(nPlusOneThreshold, 'nPlusOneThreshold', 1, 1_000_000);
    const map = new Map<string, { count: number; totalMs: number; sampleIndex: number }>();
    sqls.forEach((entry, index) => {
        const pattern = normalizeSqlPattern(typeof entry?.sql === 'string' ? entry.sql : '__invalid_sql__');
        const durationMs =
            typeof entry?.durationMs === 'number' && Number.isFinite(entry.durationMs)
                ? Math.max(0, entry.durationMs)
                : 0;
        const existing = map.get(pattern);
        if (existing) {
            existing.count += 1;
            existing.totalMs = finiteSum(existing.totalMs, durationMs);
        } else {
            map.set(pattern, { count: 1, totalMs: durationMs, sampleIndex: index });
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
        .sort(
            (left, right) =>
                right.count - left.count || right.totalMs - left.totalMs || left.pattern.localeCompare(right.pattern),
        );
}

function maskSqlLiteralsAndComments(sql: string): string {
    let result = '';
    for (let index = 0; index < sql.length; index += 1) {
        const current = sql[index];
        const next = sql[index + 1];
        if (current === '-' && next === '-') {
            index += 2;
            while (index < sql.length && sql[index] !== '\n' && sql[index] !== '\r') index += 1;
            result += ' ';
        } else if (current === '/' && next === '*') {
            index += 2;
            while (index < sql.length - 1 && !(sql[index] === '*' && sql[index + 1] === '/')) index += 1;
            index += 1;
            result += ' ';
        } else if (current === "'") {
            result += "'?'";
            while (index + 1 < sql.length) {
                index += 1;
                if (sql[index] === '\\') {
                    index += 1;
                    continue;
                }
                if (sql[index] !== "'") continue;
                if (sql[index + 1] === "'") {
                    index += 1;
                    continue;
                }
                break;
            }
        } else if (current === '$' && (next === '$' || /[a-zA-Z_]/.test(next ?? ''))) {
            const delimiterMatch = sql.slice(index).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/);
            if (!delimiterMatch) {
                result += current;
                continue;
            }
            const delimiter = delimiterMatch[0];
            const closingIndex = sql.indexOf(delimiter, index + delimiter.length);
            result += "'?'";
            index = closingIndex >= 0 ? closingIndex + delimiter.length - 1 : sql.length;
        } else if (current === '$' && /\d/.test(next ?? '')) {
            result += '$?';
            while (/\d/.test(sql[index + 1] ?? '')) index += 1;
        } else if (/\d/.test(current) && !/[a-zA-Z_$]/.test(sql[index - 1] ?? '')) {
            result += '?';
            const numericMatch = sql.slice(index).match(/^(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
            index += Math.max(0, (numericMatch?.[0].length ?? 1) - 1);
        } else {
            result += current;
        }
    }
    return result;
}

function truncateUtf8(value: string, maximumBytes: number, suffix: string): { value: string; truncated: boolean } {
    const bytes = Buffer.from(value, 'utf8');
    if (bytes.byteLength <= maximumBytes) return { value, truncated: false };
    const suffixBytes = Buffer.from(suffix, 'utf8');
    const contentBudget = Math.max(0, maximumBytes - suffixBytes.byteLength);
    let end = contentBudget;
    while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
    return { value: `${bytes.subarray(0, end).toString('utf8')}${suffix}`, truncated: true };
}

function cloneRecordedSql(entry: RecordedSql): RecordedSql {
    return {
        ...entry,
        parameters: entry.parameters.map(cloneTelemetryValue),
    };
}

function cloneTelemetryValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(cloneTelemetryValue);
    if (!isRecord(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneTelemetryValue(entry)]));
}

function finiteSum(left: number, right: number): number {
    const result = left + right;
    return Number.isFinite(result) ? result : Number.MAX_VALUE;
}

function normalizeSingleLine(value: string): string {
    return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || 'Error';
}

function assertIntegerInRange(value: number, name: string, minimum: number, maximum: number): void {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(`${name} must be a safe integer between ${minimum} and ${maximum}`);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
