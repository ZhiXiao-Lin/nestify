import dayjs = require('dayjs');

import type { LogEvent } from 'kysely';

import pc = require('picocolors');

import { KyselyConfigurationError } from './kysely-module-options.interface';

export const DEFAULT_KYSELY_LOGGER_MAX_SQL_LENGTH = 10_000;
export const DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_COUNT = 20;
export const DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_LENGTH = 256;

const MAX_KYSELY_LOGGER_TEXT_LENGTH = 1_000_000;
const MAX_KYSELY_LOGGER_PARAMETER_COUNT = 1_000;

const SQL_KEYWORDS = [
    'SELECT',
    'FROM',
    'WHERE',
    'JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TABLE',
    'INDEX',
    'PRIMARY KEY',
    'FOREIGN KEY',
    'CONSTRAINT',
    'GROUP BY',
    'ORDER BY',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'UNION',
    'DISTINCT',
    'AS',
    'ON',
    'IN',
    'NOT',
    'AND',
    'OR',
    'LIKE',
    'BETWEEN',
    'NULL',
    'IS',
    'COUNT',
    'SUM',
    'AVG',
    'MAX',
    'MIN',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
] as const;

const SQL_KEYWORD_PATTERNS = SQL_KEYWORDS.map(keyword => new RegExp(`\\b${keyword}\\b`, 'gi'));

export interface KyselyLoggerOptions {
    /** Write formatted events to the console. Defaults to true. */
    consoleOutput?: boolean;
    /** Receives the original Kysely event before console formatting. */
    onQuery?: (event: LogEvent) => void;
    /** Include bound parameter values in console output. Defaults to false. */
    logParameters?: boolean;
    /** Include error stacks in console output. Defaults to false. */
    logErrorStack?: boolean;
    maxSqlLength?: number;
    maxParameterCount?: number;
    maxParameterLength?: number;
}

interface NormalizedKyselyLoggerOptions {
    readonly consoleOutput: boolean;
    readonly onQuery?: (event: LogEvent) => void;
    readonly logParameters: boolean;
    readonly logErrorStack: boolean;
    readonly maxSqlLength: number;
    readonly maxParameterCount: number;
    readonly maxParameterLength: number;
}

/** Creates a bounded logger callback compatible with Kysely's `log` option. */
export function createKyselyLogger(options: KyselyLoggerOptions = {}): (event: LogEvent) => void {
    const normalized = normalizeKyselyLoggerOptions(options);

    return event => {
        try {
            normalized.onQuery?.(event);
        } catch (error) {
            console.error('[KYSELY LOGGER HOOK ERROR]', formatUnknownError(error, normalized.maxParameterLength));
        }

        if (!normalized.consoleOutput) {
            return;
        }

        try {
            writeLogEvent(event, normalized);
        } catch (error) {
            console.error('[KYSELY LOGGER ERROR]', formatUnknownError(error, normalized.maxParameterLength));
        }
    };
}

function normalizeKyselyLoggerOptions(options: KyselyLoggerOptions): NormalizedKyselyLoggerOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new KyselyConfigurationError('Kysely logger options must be an object.');
    }
    for (const field of ['consoleOutput', 'logParameters', 'logErrorStack'] as const) {
        if (options[field] !== undefined && typeof options[field] !== 'boolean') {
            throw new KyselyConfigurationError(`logger.${field} must be a boolean.`);
        }
    }
    if (options.onQuery !== undefined && typeof options.onQuery !== 'function') {
        throw new KyselyConfigurationError('logger.onQuery must be a function.');
    }

    return Object.freeze({
        consoleOutput: options.consoleOutput ?? true,
        onQuery: options.onQuery,
        logParameters: options.logParameters ?? false,
        logErrorStack: options.logErrorStack ?? false,
        maxSqlLength: boundedInteger(
            options.maxSqlLength,
            'logger.maxSqlLength',
            DEFAULT_KYSELY_LOGGER_MAX_SQL_LENGTH,
            1,
            MAX_KYSELY_LOGGER_TEXT_LENGTH,
        ),
        maxParameterCount: boundedInteger(
            options.maxParameterCount,
            'logger.maxParameterCount',
            DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_COUNT,
            0,
            MAX_KYSELY_LOGGER_PARAMETER_COUNT,
        ),
        maxParameterLength: boundedInteger(
            options.maxParameterLength,
            'logger.maxParameterLength',
            DEFAULT_KYSELY_LOGGER_MAX_PARAMETER_LENGTH,
            1,
            MAX_KYSELY_LOGGER_TEXT_LENGTH,
        ),
    });
}

function writeLogEvent(event: LogEvent, options: NormalizedKyselyLoggerOptions): void {
    const timestamp = pc.dim(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`);
    const duration = formatDuration(event.queryDurationMillis);
    const sql = highlightSql(sanitizeAndTruncate(event.query.sql, options.maxSqlLength));

    if (event.level === 'query') {
        console.log(`${timestamp} ${pc.bold(pc.cyan('[KYSELY QUERY]'))} ${duration}`);
        console.log(`${pc.dim('SQL:')} ${sql}`);
        writeParameters('log', event.query.parameters, options);
        return;
    }

    console.error(`${timestamp} ${pc.bold(pc.red('[KYSELY ERROR]'))} ${duration}`);
    console.error(`${pc.dim('SQL:')} ${sql}`);
    writeParameters('error', event.query.parameters, options);
    console.error(
        `${pc.red('Error:')} ${pc.bold(pc.red(formatUnknownError(event.error, options.maxParameterLength)))}`,
    );

    if (options.logErrorStack && event.error instanceof Error && event.error.stack) {
        console.error(`${pc.red('Stack:')} ${pc.gray(sanitizeAndTruncate(event.error.stack, options.maxSqlLength))}`);
    }
}

function writeParameters(
    method: 'log' | 'error',
    parameters: readonly unknown[],
    options: NormalizedKyselyLoggerOptions,
): void {
    if (!options.logParameters || parameters.length === 0) {
        return;
    }
    console[method](`${pc.dim('Parameters:')} ${formatParameters(parameters, options)}`);
}

function highlightSql(sql: string): string {
    let highlighted = sql;
    for (const regex of SQL_KEYWORD_PATTERNS) {
        highlighted = highlighted.replace(regex, match => pc.bold(pc.blue(match)));
    }
    highlighted = highlighted.replace(/'([^'\\]|\\.)*'/g, match => pc.green(match));
    highlighted = highlighted.replace(/\b\d+(?:\.\d+)?\b/g, match => pc.yellow(match));
    highlighted = highlighted.replace(/`([^`]+)`/g, match => pc.cyan(match));
    return highlighted;
}

function formatDuration(duration: number): string {
    if (!Number.isFinite(duration) || duration < 0) {
        return pc.gray('unknown');
    }
    const formatted = `${duration.toFixed(2)}ms`;
    if (duration < 1) {
        return pc.green(formatted);
    }
    if (duration < 100) {
        return pc.yellow(formatted);
    }
    return pc.red(pc.bold(formatted));
}

function formatParameters(parameters: readonly unknown[], options: NormalizedKyselyLoggerOptions): string {
    const visible = parameters.slice(0, options.maxParameterCount).map((parameter, index) => {
        const value = formatParameter(parameter, options.maxParameterLength);
        return `${pc.dim(`$${index + 1}:`)} ${value}`;
    });
    const hiddenCount = parameters.length - visible.length;
    if (hiddenCount > 0) {
        visible.push(pc.dim(`[${hiddenCount} more parameter${hiddenCount === 1 ? '' : 's'} omitted]`));
    }
    return visible.join(', ');
}

function formatParameter(parameter: unknown, maxLength: number): string {
    if (parameter === null || parameter === undefined) {
        return pc.gray('NULL');
    }
    if (typeof parameter === 'string') {
        return pc.green(JSON.stringify(sanitizeAndTruncate(parameter, maxLength)));
    }
    if (typeof parameter === 'number') {
        return pc.yellow(Number.isFinite(parameter) ? String(parameter) : `[${String(parameter)}]`);
    }
    if (typeof parameter === 'bigint') {
        return pc.yellow(`${parameter}n`);
    }
    if (typeof parameter === 'boolean') {
        return pc.magenta(String(parameter));
    }
    if (parameter instanceof Date) {
        return pc.cyan(Number.isNaN(parameter.getTime()) ? '[Invalid Date]' : parameter.toISOString());
    }
    if (typeof parameter === 'symbol') {
        return pc.white(sanitizeAndTruncate(String(parameter), maxLength));
    }
    if (typeof parameter === 'function') {
        return pc.white(`[Function${parameter.name ? ` ${parameter.name}` : ''}]`);
    }
    return pc.white(sanitizeAndTruncate(safeJsonStringify(parameter), maxLength));
}

function safeJsonStringify(value: unknown): string {
    const seen = new WeakSet<object>();
    try {
        return (
            JSON.stringify(value, (_key, nested: unknown) => {
                if (typeof nested === 'bigint') {
                    return `${nested}n`;
                }
                if (nested && typeof nested === 'object') {
                    if (seen.has(nested)) {
                        return '[Circular]';
                    }
                    seen.add(nested);
                }
                return nested;
            }) ?? '[Unserializable value]'
        );
    } catch {
        return '[Unserializable value]';
    }
}

function formatUnknownError(error: unknown, maxLength: number): string {
    const message = error instanceof Error ? error.message : String(error);
    return sanitizeAndTruncate(message, maxLength);
}

function sanitizeAndTruncate(value: string, maxLength: number): string {
    const sanitized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ');
    if (sanitized.length <= maxLength) {
        return sanitized;
    }
    return `${sanitized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function boundedInteger(
    value: number | undefined,
    name: string,
    fallback: number,
    minimum: number,
    maximum: number,
): number {
    const resolved = value ?? fallback;
    if (!Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
        throw new KyselyConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
    return resolved;
}
