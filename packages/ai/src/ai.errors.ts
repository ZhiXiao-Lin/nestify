/** Invalid Nest module or invocation configuration. */
export class AiConfigurationError extends TypeError {
    override readonly name = 'AiConfigurationError';
}

/** The loaded A3S Code SDK does not satisfy the supported public contract. */
export class AiSdkContractError extends TypeError {
    override readonly name = 'AiSdkContractError';
}

/** A new operation was attempted after service shutdown began. */
export class AiServiceClosedError extends Error {
    override readonly name = 'AiServiceClosedError';

    constructor() {
        super('AiService is shutting down and cannot start new operations');
    }
}

/** A one-shot run or stream was cancelled through its AbortSignal. */
export class AiOperationAbortedError extends Error {
    override readonly name = 'AiOperationAbortedError';
    readonly code = 'AI_OPERATION_ABORTED' as const;
    readonly reason: unknown;

    constructor(reason?: unknown) {
        super('AI operation was aborted', reason === undefined ? undefined : { cause: reason });
        this.reason = reason;
    }
}

/** Preserves both an operation failure and the failure to clean up its session. */
export class AiResourceCleanupError extends AggregateError {
    override readonly name = 'AiResourceCleanupError';
    readonly operationError: unknown;
    readonly cleanupError: unknown;

    constructor(operationError: unknown, cleanupError: unknown, message = 'AI operation and session cleanup both failed') {
        super([operationError, cleanupError], message);
        this.operationError = operationError;
        this.cleanupError = cleanupError;
    }
}
