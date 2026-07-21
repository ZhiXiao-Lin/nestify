import type { OwnedSandboxInstance } from './sandbox.types';

export class SandboxConfigurationError extends Error {
    override readonly name = 'SandboxConfigurationError';
}

export interface SandboxServiceClosedErrorOptions extends ErrorOptions {
    /** Native instance that could not be cleaned up while its create operation was closing. */
    readonly unreleasedInstance?: OwnedSandboxInstance;
}

export class SandboxServiceClosedError extends Error {
    override readonly name = 'SandboxServiceClosedError';
    readonly unreleasedInstance?: OwnedSandboxInstance;

    constructor(options?: SandboxServiceClosedErrorOptions) {
        super('SandboxService is shutting down and cannot start new operations', options);
        this.unreleasedInstance = options?.unreleasedInstance;
    }
}

export class SandboxSdkError extends Error {
    override readonly name = 'SandboxSdkError';
}

export class SandboxShutdownTimeoutError extends Error {
    override readonly name = 'SandboxShutdownTimeoutError';

    constructor(readonly timeoutMs: number) {
        super(`Sandbox shutdown timed out after ${timeoutMs}ms while draining in-flight operations`);
    }
}

export class SandboxCleanupError extends AggregateError {
    override readonly name = 'SandboxCleanupError';

    constructor(errors: readonly unknown[]) {
        super([...errors], `Sandbox shutdown cleanup failed with ${errors.length} error(s)`);
    }
}
