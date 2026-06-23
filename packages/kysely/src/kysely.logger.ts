import type { LogEvent } from 'kysely';
import * as dayjsModule from 'dayjs';
import * as pcModule from 'picocolors';

// Handle both ESM and CJS imports
const dayjs = (dayjsModule as any).default || dayjsModule;
const pc = (pcModule as any).default || pcModule;

/**
 * SQL keywords for syntax highlighting
 */
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

/**
 * Regular expressions cache for better performance
 */
const regexCache = new Map<string, RegExp>();

/**
 * Get or create a cached regex pattern
 */
const getCachedRegex = (pattern: string, flags: string): RegExp => {
    const key = `${pattern}:${flags}`;
    let regex = regexCache.get(key);
    if (!regex) {
        regex = new RegExp(pattern, flags);
        regexCache.set(key, regex);
    }
    return regex;
};

/**
 * Highlights SQL query with color-coded syntax
 * @param sql - The SQL query string to highlight
 * @returns Highlighted SQL string with ANSI color codes
 */
const highlightSql = (sql: string): string => {
    let highlightedSql = sql;

    // Highlight keywords
    for (const keyword of SQL_KEYWORDS) {
        const regex = getCachedRegex(`\\b${keyword}\\b`, 'gi');
        highlightedSql = highlightedSql.replace(regex, pc.bold(pc.blue(keyword.toUpperCase())));
    }

    // Highlight string literals
    highlightedSql = highlightedSql.replace(/'([^'\\]|\\.)*'/g, pc.green('$&'));

    // Highlight numbers
    highlightedSql = highlightedSql.replace(/\b\d+(?:\.\d+)?\b/g, pc.yellow('$&'));

    // Highlight identifiers with backticks
    highlightedSql = highlightedSql.replace(/`([^`]+)`/g, pc.cyan('$&'));

    return highlightedSql;
};

/**
 * Formats query execution duration with color coding based on performance
 * - Green: < 1ms (excellent)
 * - Yellow: 1-100ms (acceptable)
 * - Red: > 100ms (slow, needs optimization)
 * @param duration - Query duration in milliseconds
 * @returns Formatted duration string with color coding
 */
const formatDuration = (duration: number): string => {
    const formatted = `${duration.toFixed(2)}ms`;
    if (duration < 1) {
        return pc.green(formatted);
    }
    if (duration < 100) {
        return pc.yellow(formatted);
    }
    return pc.red(pc.bold(formatted));
};

/**
 * Formats query parameters with type-specific color coding
 * @param params - Array of query parameters
 * @returns Formatted parameters string
 */
const formatParameters = (params: readonly unknown[]): string => {
    return params
        .map((param, index) => {
            let formattedParam: string;

            if (param === null || param === undefined) {
                formattedParam = pc.gray('NULL');
            } else if (typeof param === 'string') {
                formattedParam = pc.green(`'${param}'`);
            } else if (typeof param === 'number') {
                formattedParam = pc.yellow(String(param));
            } else if (typeof param === 'boolean') {
                formattedParam = pc.magenta(String(param));
            } else if (param instanceof Date) {
                formattedParam = pc.cyan(param.toISOString());
            } else {
                formattedParam = pc.white(JSON.stringify(param));
            }

            return `${pc.dim(`$${index + 1}:`)} ${formattedParam}`;
        })
        .join(', ');
};

/**
 * Type guard to check if error is an Error instance
 */
const isError = (error: unknown): error is Error => {
    return error instanceof Error;
};

export interface KyselyLoggerOptions {
    consoleOutput?: boolean;
    onQuery?: (event: LogEvent) => void;
}

/**
 * Creates a Kysely logger function with enhanced formatting and syntax highlighting
 * @returns Logger function compatible with Kysely's log configuration
 */
export const createKyselyLogger = (options: KyselyLoggerOptions = {}) => {
    return (event: LogEvent) => {
        try {
            options.onQuery?.(event);
        } catch (error) {
            console.error('[KYSELY LOGGER HOOK ERROR]', error);
        }

        if (options.consoleOutput === false) {
            return;
        }

        const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const formattedTimestamp = pc.dim(`[${timestamp}]`);

        if (event.level === 'query') {
            const duration = formatDuration(event.queryDurationMillis);

            // Query log header
            console.log(`${formattedTimestamp} ${pc.bold(pc.cyan('[KYSELY QUERY]'))} ${duration}`);

            // Highlighted SQL query
            const formattedSql = highlightSql(event.query.sql);
            console.log(`${pc.dim('┌─')} ${formattedSql}`);

            // Parameters (if any)
            if (event.query.parameters && event.query.parameters.length > 0) {
                console.log(
                    `${pc.dim('├─')} ${pc.bold(pc.magenta('Parameters:'))} ${formatParameters(event.query.parameters)}`,
                );
            }

            // Footer
            console.log(pc.dim('└─────────────────────────────────────────────────────────────────'));
        } else if (event.level === 'error') {
            const duration = formatDuration(event.queryDurationMillis);

            // Error log header
            console.error(`${formattedTimestamp} ${pc.bold(pc.red('[KYSELY ERROR]'))} ${duration}`);

            // SQL query that caused the error
            const formattedSql = highlightSql(event.query.sql);
            console.error(`${pc.dim('┌─')} ${pc.red('Query:')} ${formattedSql}`);

            // Parameters (if any)
            if (event.query.parameters && event.query.parameters.length > 0) {
                console.error(
                    `${pc.dim('├─')} ${pc.bold(pc.magenta('Parameters:'))} ${formatParameters(event.query.parameters)}`,
                );
            }

            // Error details
            const error = event.error;
            if (isError(error)) {
                console.error(`${pc.dim('├─')} ${pc.red('Error:')} ${pc.bold(pc.red(error.message))}`);

                if (error.stack) {
                    console.error(`${pc.dim('├─')} ${pc.red('Stack Trace:')}`);
                    console.error(`${pc.dim('│ ')} ${pc.gray(error.stack)}`);
                }
            } else {
                console.error(`${pc.dim('├─')} ${pc.red('Error:')} ${pc.bold(pc.red(String(error)))}`);
            }

            console.error(pc.dim('└─────────────────────────────────────────────────────────────────'));
        }
    };
};
