import { AsyncLocalStorage } from 'node:async_hooks';
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
