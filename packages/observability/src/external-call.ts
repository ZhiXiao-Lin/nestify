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
