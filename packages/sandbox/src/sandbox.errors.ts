export class SandboxConfigurationError extends Error {
    override readonly name = 'SandboxConfigurationError';
}

export class SandboxServiceClosedError extends Error {
    override readonly name = 'SandboxServiceClosedError';

    constructor() {
        super('SandboxService is shutting down and cannot start new operations');
    }
}

export class SandboxSdkError extends Error {
    override readonly name = 'SandboxSdkError';
}
