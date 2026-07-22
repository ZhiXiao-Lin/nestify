export const DEFAULT_HTTP_TEXT_MAX_LENGTH = 1_024;
export const DEFAULT_HTTP_PATH_MAX_LENGTH = 2_048;
export const DEFAULT_HTTP_DETAILS_MAX_DEPTH = 5;
export const DEFAULT_HTTP_DETAILS_MAX_ENTRIES = 256;

export class HttpConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = HttpConfigurationError.name;
    }
}

export interface HttpRequestMetadataCarrier {
    method?: unknown;
    originalUrl?: unknown;
    path?: unknown;
    url?: unknown;
}

export interface NormalizeHttpTextOptions {
    fallback?: string;
    maxLength?: number;
    preserveEmpty?: boolean;
}

export function normalizeHttpText(value: unknown, options: NormalizeHttpTextOptions = {}): string {
    const maxLength = normalizePositiveInteger(
        options.maxLength,
        'maxLength',
        DEFAULT_HTTP_TEXT_MAX_LENGTH,
        1,
        1_000_000,
    );
    if (typeof value !== 'string') {
        return options.fallback ?? '';
    }

    const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
    if (!normalized && !options.preserveEmpty) {
        return options.fallback ?? '';
    }
    return truncateHttpText(normalized, maxLength);
}

export function truncateHttpText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function getSafeRequestPath(request: HttpRequestMetadataCarrier): string {
    const candidate = [request.path, request.originalUrl, request.url].find(value => typeof value === 'string');
    const withoutQuery = typeof candidate === 'string' ? candidate.split(/[?#]/, 1)[0] : '/';
    return normalizeHttpText(withoutQuery, { fallback: '/', maxLength: DEFAULT_HTTP_PATH_MAX_LENGTH });
}

export function getSafeRequestMethod(request: HttpRequestMetadataCarrier): string {
    const method = normalizeHttpText(request.method, { fallback: 'UNKNOWN', maxLength: 16 }).toUpperCase();
    return /^[A-Z]+$/.test(method) ? method : 'UNKNOWN';
}

export function normalizeHttpStatus(value: unknown, fallback = 500): number {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599) {
        return value;
    }
    return fallback;
}

export function normalizePublicDetails(value: unknown): Record<string, unknown> | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const state: DetailNormalizationState = {
        entries: 0,
        seen: new WeakSet<object>(),
    };
    return normalizeDetailRecord(value, 0, state);
}

interface DetailNormalizationState {
    entries: number;
    seen: WeakSet<object>;
}

function normalizeDetailValue(value: unknown, depth: number, state: DetailNormalizationState): unknown {
    if (value === null || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return normalizeHttpText(value, { maxLength: DEFAULT_HTTP_TEXT_MAX_LENGTH, preserveEmpty: true });
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : String(value);
    }
    if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
        return normalizeHttpText(String(value), { maxLength: DEFAULT_HTTP_TEXT_MAX_LENGTH, preserveEmpty: true });
    }
    if (value === undefined) {
        return undefined;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? '[Invalid Date]' : value.toISOString();
    }
    if (value instanceof Error) {
        return {
            name: normalizeHttpText(value.name, { fallback: 'Error', maxLength: 128 }),
            message: normalizeHttpText(value.message, { fallback: 'Error', maxLength: DEFAULT_HTTP_TEXT_MAX_LENGTH }),
        };
    }
    if (depth >= DEFAULT_HTTP_DETAILS_MAX_DEPTH) {
        return '[Maximum detail depth reached]';
    }
    if (state.entries >= DEFAULT_HTTP_DETAILS_MAX_ENTRIES) {
        return '[Detail entry limit reached]';
    }
    if (Array.isArray(value)) {
        if (state.seen.has(value)) {
            return '[Circular]';
        }
        state.seen.add(value);
        const result: unknown[] = [];
        for (const item of value) {
            if (state.entries >= DEFAULT_HTTP_DETAILS_MAX_ENTRIES) {
                result.push('[Detail entry limit reached]');
                break;
            }
            state.entries += 1;
            result.push(normalizeDetailValue(item, depth + 1, state));
        }
        return result;
    }
    if (isRecord(value)) {
        return normalizeDetailRecord(value, depth, state);
    }
    return normalizeHttpText(String(value), { maxLength: DEFAULT_HTTP_TEXT_MAX_LENGTH, preserveEmpty: true });
}

function normalizeDetailRecord(
    value: Record<string, unknown>,
    depth: number,
    state: DetailNormalizationState,
): Record<string, unknown> {
    if (state.seen.has(value)) {
        return { value: '[Circular]' };
    }
    state.seen.add(value);

    const entries: Array<[string, unknown]> = [];
    const usedKeys = new Set<string>();
    for (const key of Object.keys(value)) {
        if (state.entries >= DEFAULT_HTTP_DETAILS_MAX_ENTRIES) {
            entries.push(['_truncated', '[Detail entry limit reached]']);
            break;
        }
        state.entries += 1;
        const safeKey = createUniqueDetailKey(normalizeHttpText(key, { fallback: '_', maxLength: 128 }), usedKeys);
        let normalized: unknown;
        try {
            normalized = normalizeDetailValue(value[key], depth + 1, state);
        } catch {
            normalized = '[Unserializable detail]';
        }
        if (normalized !== undefined) {
            entries.push([safeKey, normalized]);
            usedKeys.add(safeKey);
        }
    }
    return Object.fromEntries(entries);
}

function createUniqueDetailKey(candidate: string, usedKeys: Set<string>): string {
    if (!usedKeys.has(candidate)) return candidate;
    for (let suffix = 2; suffix <= DEFAULT_HTTP_DETAILS_MAX_ENTRIES; suffix += 1) {
        const marker = `_${suffix}`;
        const unique = `${candidate.slice(0, 128 - marker.length)}${marker}`;
        if (!usedKeys.has(unique)) return unique;
    }
    return '_duplicate';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizePositiveInteger(
    value: number | undefined,
    name: string,
    fallback: number,
    minimum: number,
    maximum: number,
): number {
    const resolved = value ?? fallback;
    if (!Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
        throw new HttpConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
    return resolved;
}
