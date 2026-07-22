import type { BaseQueryParams, DataFormat } from '@clickhouse/client';
import { ClickHouseRequestError, type ClickHouseRequestOptions } from './clickhouse.types';

interface SqlToken {
    value: string;
    start: number;
    end: number;
    identifier: boolean;
}

const RESULT_STATEMENTS = new Set(['SELECT', 'WITH', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'EXISTS']);
const SUPPORTED_FORMATS = [
    'JSONObjectEachRow',
    'JSON',
    'JSONStrings',
    'JSONCompact',
    'JSONCompactStrings',
    'JSONColumnsWithMetadata',
    'JSONEachRow',
    'JSONStringsEachRow',
    'JSONCompactEachRow',
    'JSONCompactStringsEachRow',
    'JSONCompactEachRowWithNames',
    'JSONCompactEachRowWithNamesAndTypes',
    'JSONCompactStringsEachRowWithNames',
    'JSONCompactStringsEachRowWithNamesAndTypes',
    'JSONEachRowWithProgress',
    'CSV',
    'CSVWithNames',
    'CSVWithNamesAndTypes',
    'TabSeparated',
    'TabSeparatedRaw',
    'TabSeparatedWithNames',
    'TabSeparatedWithNamesAndTypes',
    'CustomSeparated',
    'CustomSeparatedWithNames',
    'CustomSeparatedWithNamesAndTypes',
    'Parquet',
] as const satisfies readonly DataFormat[];
const FORMATS = new Map<string, DataFormat>(SUPPORTED_FORMATS.map(format => [format.toLowerCase(), format]));

export function createClickHouseQueryOptions(
    options: ClickHouseRequestOptions,
    defaultTimeoutMs: number,
): BaseQueryParams {
    assertClickHouseRequestOptions(options);
    const timeoutMs = positiveInteger(options.timeoutMs ?? defaultTimeoutMs, 'timeoutMs');
    const queryId = optionalString(options.queryId, 'queryId');
    const sessionId = optionalString(options.sessionId, 'sessionId');
    const role = normalizeRole(options.role);
    const httpHeaders = normalizeHeaders(options.httpHeaders);
    validateAuth(options.auth);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const abortSignal = options.abortSignal ? AbortSignal.any([options.abortSignal, timeoutSignal]) : timeoutSignal;
    return {
        query_id: queryId,
        clickhouse_settings: options.clickHouseSettings,
        query_params: options.queryParams,
        abort_signal: abortSignal,
        session_id: sessionId,
        role,
        auth: options.auth,
        http_headers: httpHeaders,
        use_multipart_params: options.useMultipartParams,
        use_multipart_params_auto: options.useMultipartParamsAuto,
    };
}

export function splitTrailingClickHouseFormat(
    sql: string,
    fallback: DataFormat,
): { query: string; format: DataFormat } {
    const query = normalizeClickHouseSql(sql);
    const tokens = tokenizeSql(query);
    while (tokens.at(-1)?.value === ';') {
        tokens.pop();
    }
    if (tokens.length === 0) {
        throw new ClickHouseRequestError('sql must contain a statement');
    }
    const formatName = tokens.at(-1);
    const formatKeyword = tokens.at(-2);
    if (!formatName || !formatKeyword || formatKeyword.value.toUpperCase() !== 'FORMAT') {
        return { query: query.slice(0, tokens.at(-1)!.end).trim(), format: fallback };
    }
    if (!formatName.identifier) {
        throw new ClickHouseRequestError('FORMAT must be followed by a supported format name');
    }
    const format = FORMATS.get(formatName.value.toLowerCase());
    if (!format) {
        throw new ClickHouseRequestError(`Unsupported ClickHouse response format '${formatName.value}'`);
    }
    const withoutFormat = query.slice(0, formatKeyword.start).trim().replace(/;+$/, '').trim();
    if (!withoutFormat) {
        throw new ClickHouseRequestError('SQL before FORMAT must not be empty');
    }
    return { query: withoutFormat, format };
}

export function expectsClickHouseResult(sql: string): boolean {
    const firstKeyword = tokenizeSql(sql)
        .find(token => token.identifier)
        ?.value.toUpperCase();
    return firstKeyword ? RESULT_STATEMENTS.has(firstKeyword) : false;
}

export function normalizeClickHouseSql(sql: string): string {
    if (typeof sql !== 'string' || sql.trim().length === 0) {
        throw new ClickHouseRequestError('sql must be a non-empty string');
    }
    return sql.trim();
}

export function normalizeClickHouseTable(table: string): string {
    if (typeof table !== 'string' || table.trim().length === 0 || /[\r\n\0]/.test(table)) {
        throw new ClickHouseRequestError('table must be a non-empty single-line identifier or expression');
    }
    return table.trim();
}

export function resolveClickHouseDatabase(
    database: string | null | undefined,
    defaultDatabase: string,
    rootDatabase: string,
): string {
    if (database === undefined) {
        return defaultDatabase;
    }
    if (database === null) {
        return rootDatabase;
    }
    if (typeof database !== 'string' || database.trim().length === 0) {
        throw new ClickHouseRequestError('database must be a non-empty string or null');
    }
    return database.trim();
}

export function assertClickHouseRequestOptions(options: ClickHouseRequestOptions): void {
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
        throw new ClickHouseRequestError('request options must be an object');
    }
    if (options.abortSignal !== undefined && !(options.abortSignal instanceof AbortSignal)) {
        throw new ClickHouseRequestError('abortSignal must be an AbortSignal');
    }
    if (options.queryParams !== undefined && !isRecord(options.queryParams)) {
        throw new ClickHouseRequestError('queryParams must be an object');
    }
    if (options.clickHouseSettings !== undefined && !isRecord(options.clickHouseSettings)) {
        throw new ClickHouseRequestError('clickHouseSettings must be an object');
    }
}

function validateAuth(auth: ClickHouseRequestOptions['auth']): void {
    if (auth === undefined) {
        return;
    }
    if (!isRecord(auth)) {
        throw new ClickHouseRequestError('auth must be an object');
    }
    if ('access_token' in auth) {
        optionalString(auth.access_token, 'auth.access_token');
        if ('username' in auth || 'password' in auth) {
            throw new ClickHouseRequestError('JWT auth cannot be combined with username/password');
        }
        return;
    }
    requiredString(auth.username, 'auth.username');
    if (typeof auth.password !== 'string') {
        throw new ClickHouseRequestError('auth.password must be a string');
    }
}

function normalizeRole(role: ClickHouseRequestOptions['role']): string | string[] | undefined {
    if (role === undefined) {
        return undefined;
    }
    if (Array.isArray(role)) {
        if (role.length === 0) {
            throw new ClickHouseRequestError('role must contain at least one role');
        }
        return role.map((value, index) => requiredString(value, `role[${index}]`));
    }
    return requiredString(role, 'role');
}

function normalizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
    if (headers === undefined) {
        return undefined;
    }
    if (!isRecord(headers)) {
        throw new ClickHouseRequestError('httpHeaders must be an object');
    }
    const normalized: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
        const normalizedName = name.trim();
        if (!normalizedName || /[\r\n]/.test(normalizedName)) {
            throw new ClickHouseRequestError('httpHeaders contains an invalid header name');
        }
        if (typeof value !== 'string' || /[\r\n]/.test(value)) {
            throw new ClickHouseRequestError(`httpHeaders.${normalizedName} must be a single-line string`);
        }
        normalized[normalizedName] = value;
    }
    return normalized;
}

function tokenizeSql(sql: string): SqlToken[] {
    const tokens: SqlToken[] = [];
    let index = 0;
    while (index < sql.length) {
        const char = sql[index];
        const next = sql[index + 1];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        if ((char === '-' && next === '-') || char === '#') {
            index += char === '#' ? 1 : 2;
            while (index < sql.length && sql[index] !== '\n') {
                index += 1;
            }
            continue;
        }
        if (char === '/' && next === '*') {
            index += 2;
            while (index < sql.length && !(sql[index] === '*' && sql[index + 1] === '/')) {
                index += 1;
            }
            index = Math.min(sql.length, index + 2);
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            const quote = char;
            const start = index;
            index += 1;
            while (index < sql.length) {
                if (sql[index] === '\\') {
                    index += 2;
                    continue;
                }
                if (sql[index] === quote) {
                    if (sql[index + 1] === quote) {
                        index += 2;
                        continue;
                    }
                    index += 1;
                    break;
                }
                index += 1;
            }
            tokens.push({ value: sql.slice(start, index), start, end: index, identifier: false });
            continue;
        }
        if (/[A-Za-z_]/.test(char)) {
            const start = index;
            index += 1;
            while (index < sql.length && /[A-Za-z0-9_]/.test(sql[index])) {
                index += 1;
            }
            tokens.push({ value: sql.slice(start, index), start, end: index, identifier: true });
            continue;
        }
        tokens.push({ value: char, start: index, end: index + 1, identifier: false });
        index += 1;
    }
    return tokens;
}

function requiredString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ClickHouseRequestError(`${name} must be a non-empty string`);
    }
    return value.trim();
}

function optionalString(value: unknown, name: string): string | undefined {
    return value === undefined ? undefined : requiredString(value, name);
}

function positiveInteger(value: unknown, name: string): number {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new ClickHouseRequestError(`${name} must be a positive safe integer`);
    }
    return value as number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
