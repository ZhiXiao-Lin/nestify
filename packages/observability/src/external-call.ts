import { AsyncLocalStorage } from 'node:async_hooks';

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
    captureErrorDetails?: boolean;
}

export type NormalizedExternalCallCollectorOptions = Required<ExternalCallCollectorOptions>;

const EXTERNAL_CALL_KINDS = new Set<ExternalCallKind>(['http', 'db', 'redis', 's3', 'queue', 'cache', 'custom']);
const MAX_ENTRIES_PER_REQUEST = 10_000;
const MAX_FIELD_LENGTH = 4096;

export const DEFAULT_EXTERNAL_CALL_OPTIONS: Readonly<NormalizedExternalCallCollectorOptions> = Object.freeze({
    maxEntriesPerRequest: 200,
    maxTargetLength: 256,
    maxOpLength: 64,
    maxErrorLength: 200,
    captureErrorDetails: false,
});

let externalCallOptions: Readonly<NormalizedExternalCallCollectorOptions> = DEFAULT_EXTERNAL_CALL_OPTIONS;
export const externalCallCollectorStorage = new AsyncLocalStorage<RecordedExternalCall[]>();

export function configureExternalCallCollector(options: Partial<ExternalCallCollectorOptions>): void {
    if (!isRecord(options)) throw new TypeError('external call collector options must be an object');
    const next = { ...DEFAULT_EXTERNAL_CALL_OPTIONS, ...options };
    assertBoundedPositiveInteger(next.maxEntriesPerRequest, 'maxEntriesPerRequest', MAX_ENTRIES_PER_REQUEST);
    assertBoundedPositiveInteger(next.maxTargetLength, 'maxTargetLength', MAX_FIELD_LENGTH);
    assertBoundedPositiveInteger(next.maxOpLength, 'maxOpLength', MAX_FIELD_LENGTH);
    assertBoundedPositiveInteger(next.maxErrorLength, 'maxErrorLength', MAX_FIELD_LENGTH);
    if (typeof next.captureErrorDetails !== 'boolean') {
        throw new TypeError('captureErrorDetails must be a boolean');
    }
    externalCallOptions = Object.freeze(next);
}

export function getExternalCallCollectorOptions(): Readonly<NormalizedExternalCallCollectorOptions> {
    return { ...externalCallOptions };
}

export function getRecordedExternalCalls(): RecordedExternalCall[] | null {
    const entries = externalCallCollectorStorage.getStore();
    return entries ? entries.map(entry => ({ ...entry })) : null;
}

export function getRecordedExternalCallsOrEmpty(): RecordedExternalCall[] {
    return getRecordedExternalCalls() ?? [];
}

export function recordExternalCall(input: {
    kind: ExternalCallKind;
    target: string;
    op: string;
    durationMs: number;
    error?: unknown;
}): void {
    const store = externalCallCollectorStorage.getStore();
    if (!store || store.length >= externalCallOptions.maxEntriesPerRequest || !isRecord(input)) return;
    try {
        store.push({
            kind: EXTERNAL_CALL_KINDS.has(input.kind) ? input.kind : 'custom',
            target: normalizeText(input.target, externalCallOptions.maxTargetLength, '__unknown_target__'),
            op: normalizeText(input.op, externalCallOptions.maxOpLength, '__unknown_operation__'),
            durationMs: Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs) : 0,
            error: serializeError(
                input.error,
                externalCallOptions.maxErrorLength,
                externalCallOptions.captureErrorDetails,
            ),
            timestamp: Date.now(),
        });
    } catch {
        // Instrumentation must never change the outcome of the operation it observes.
    }
}

export async function traceExternalCall<T>(
    input: { kind: ExternalCallKind; target: string; op: string },
    fn: () => Promise<T>,
): Promise<T> {
    if (typeof fn !== 'function') throw new TypeError('external call operation must be a function');
    const start = process.hrtime.bigint();
    try {
        const result = await fn();
        recordExternalCall({ ...input, durationMs: elapsedMilliseconds(start) });
        return result;
    } catch (error) {
        recordExternalCall({ ...input, durationMs: elapsedMilliseconds(start), error });
        throw error;
    }
}

function clip(value: string, max: number): string {
    if (value.length <= max) return value;
    if (max <= 3) return '.'.repeat(max);
    return `${value.slice(0, max - 3)}...`;
}

function normalizeText(value: unknown, max: number, fallback: string): string {
    if (typeof value !== 'string') return clip(fallback, max);
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return clip(normalized || fallback, max);
}

function serializeError(error: unknown, max: number, captureDetails: boolean): string | undefined {
    if (error === undefined || error === null) return undefined;
    if (!captureDetails) return error instanceof Error ? normalizeText(error.name, max, 'Error') : 'Error';
    if (error instanceof Error) return normalizeText(error.message || error.name, max, 'Error');
    return normalizeText(typeof error === 'string' ? error : '', max, 'Error');
}

function elapsedMilliseconds(start: bigint): number {
    return Math.max(0, Number(process.hrtime.bigint() - start) / 1e6);
}

function assertBoundedPositiveInteger(value: number, name: string, maximum: number): void {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
        throw new RangeError(`${name} must be a positive safe integer no greater than ${maximum}`);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
