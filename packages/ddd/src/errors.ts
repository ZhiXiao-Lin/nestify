export class DomainValidationError extends Error {
    public readonly details?: Record<string, unknown>;

    constructor(message: string, details?: Record<string, unknown>) {
        const normalizedMessage = normalizeDomainErrorMessage(message);
        super(normalizedMessage);
        this.name = 'DomainValidationError';
        this.details = snapshotDomainErrorDetails(details);
    }
}

function snapshotDomainErrorDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined;
    try {
        const entries: Array<[string, unknown]> = [];
        const keys = Object.keys(details);
        for (const key of keys.slice(0, 64)) {
            let value: unknown;
            try {
                value = Reflect.get(details, key);
            } catch {
                value = '[Unreadable detail]';
            }
            entries.push([key.slice(0, 128), value]);
        }
        if (keys.length > 64) entries.push(['_truncated', true]);
        return Object.freeze(Object.fromEntries(entries));
    } catch {
        return Object.freeze({ details: '[Unserializable details]' });
    }
}

function normalizeDomainErrorMessage(message: string): string {
    if (typeof message !== 'string') return 'Domain validation failed';
    const normalized = message.trim();
    if (!normalized) return 'Domain validation failed';
    return normalized.length <= 4_096 ? normalized : `${normalized.slice(0, 4_095)}…`;
}
