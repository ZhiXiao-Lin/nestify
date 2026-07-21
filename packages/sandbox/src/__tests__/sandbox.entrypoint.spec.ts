import {
    createA3SBoxConnectionConfig,
    DEFAULT_SANDBOX_SHUTDOWN_TIMEOUT_MS,
    SandboxCleanupError,
    SandboxConfigurationError,
    SandboxModule,
    SandboxSdkError,
    SandboxService,
    SandboxServiceClosedError,
    SandboxShutdownTimeoutError,
} from '../index';

describe('@a3s-lab/sandbox entrypoint', () => {
    it('exports its public runtime surface', () => {
        expect(createA3SBoxConnectionConfig).toEqual(expect.any(Function));
        expect(DEFAULT_SANDBOX_SHUTDOWN_TIMEOUT_MS).toBe(30_000);
        expect(SandboxModule).toEqual(expect.any(Function));
        expect(SandboxService).toEqual(expect.any(Function));
        expect(SandboxCleanupError).toEqual(expect.any(Function));
        expect(SandboxConfigurationError).toEqual(expect.any(Function));
        expect(SandboxSdkError).toEqual(expect.any(Function));
        expect(SandboxServiceClosedError).toEqual(expect.any(Function));
        expect(SandboxShutdownTimeoutError).toEqual(expect.any(Function));
    });
});
