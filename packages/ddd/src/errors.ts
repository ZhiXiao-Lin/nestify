export class DomainValidationError extends Error {
    public readonly details?: Record<string, unknown>;

    constructor(message: string, details?: Record<string, unknown>) {
        super(message);
        this.name = 'DomainValidationError';
        this.details = details;
    }
}
