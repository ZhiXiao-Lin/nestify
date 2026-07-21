import { SandboxConfigurationError, SandboxSdkError, SandboxServiceClosedError } from '../sandbox.errors';
import { SandboxService } from '../sandbox.service';
import type {
    CodeInterpreterCreateOptions,
    CodeInterpreterInstance,
    CodeInterpreterSdkModule,
    SandboxConnectOptions,
    SandboxCreateOptions,
    SandboxInstance,
    SandboxModuleOptions,
    SandboxSdkLoader,
    SandboxSdkModule,
} from '../sandbox.types';

describe('SandboxService', () => {
    it('loads SDK entrypoints lazily, caches them, and applies owned connection settings', async () => {
        const harness = createHarness();
        const service = createService(harness.loader, {
            defaultTemplate: 'node-v1',
            defaultTimeoutMs: 60_000,
        });

        expect(harness.loadSandboxSdk).not.toHaveBeenCalled();
        expect(harness.loadCodeInterpreterSdk).not.toHaveBeenCalled();

        const callerOptions = {
            apiUrl: 'https://caller.invalid',
            domain: 'caller.invalid',
            apiKey: 'caller-key',
            sandboxUrl: 'https://caller-sandbox.invalid',
            validateApiKey: true,
            metadata: { request: 'one' },
        } as unknown as SandboxCreateOptions;
        const created = await service.create(undefined, callerOptions);
        await service.connect('existing-sandbox', { timeoutMs: 12_000 } as SandboxConnectOptions);

        expect(created).toBe(harness.sandbox);
        expect(harness.loadSandboxSdk).toHaveBeenCalledTimes(1);
        expect(harness.sandboxCreate).toHaveBeenCalledWith('node-v1', {
            apiUrl: 'https://api.box.test',
            domain: 'box.test',
            validateApiKey: false,
            apiKey: 'module-key',
            metadata: { request: 'one' },
            timeoutMs: 60_000,
        });
        expect(harness.sandboxConnect).toHaveBeenCalledWith(
            'existing-sandbox',
            expect.objectContaining({
                apiUrl: 'https://api.box.test',
                domain: 'box.test',
                apiKey: 'module-key',
                validateApiKey: false,
                timeoutMs: 12_000,
            }),
        );
    });

    it('does not allow a caller API key when the module connection omits one', async () => {
        const harness = createHarness();
        const service = new SandboxService({
            connection: { apiUrl: 'https://api.box.test' },
            sdkLoader: harness.loader,
        });

        await service.create('node-v1', {
            apiKey: 'caller-key',
            sandboxUrl: 'https://caller.invalid',
        } as unknown as SandboxCreateOptions);

        const passedOptions = harness.sandboxCreate.mock.calls[0]?.[1] as Record<string, unknown>;
        expect(passedOptions.apiKey).toBeUndefined();
        expect(passedOptions.sandboxUrl).toBeUndefined();
    });

    it('uses the first-party SDK default template when neither the call nor module selects one', async () => {
        const harness = createHarness();
        const service = createService(harness.loader);

        await expect(service.create({ metadata: { source: 'sdk-default' } } as SandboxCreateOptions)).resolves.toBe(
            harness.sandbox,
        );

        expect(harness.sandboxCreate).toHaveBeenCalledWith({
            apiUrl: 'https://api.box.test',
            domain: 'box.test',
            validateApiKey: false,
            apiKey: 'module-key',
            metadata: { source: 'sdk-default' },
        });
    });

    it('tracks only instances created by this service and supports release', async () => {
        const harness = createHarness();
        const service = createService(harness.loader);

        const created = await service.create('node-v1');
        const connected = await service.connect('existing');

        expect(service.owns(created)).toBe(true);
        expect(service.owns(connected)).toBe(false);
        expect(service.release(connected)).toBe(false);
        expect(service.release(created)).toBe(true);
        await service.onModuleDestroy();
        expect(harness.sandboxKill).not.toHaveBeenCalled();
    });

    it('kills an owned instance once and restores ownership after a failed kill', async () => {
        const harness = createHarness();
        const failure = new Error('temporary kill failure');
        harness.sandboxKill.mockRejectedValueOnce(failure).mockResolvedValueOnce(true);
        const service = createService(harness.loader);
        const created = await service.create('node-v1');

        await expect(service.kill(created)).rejects.toBe(failure);
        expect(service.owns(created)).toBe(true);
        await expect(service.kill(created)).resolves.toBe(true);
        await expect(service.kill(created)).resolves.toBe(false);
        expect(harness.sandboxKill).toHaveBeenCalledTimes(2);
    });

    it('automatically kills withSandbox instances after success and failure', async () => {
        const success = createHarness();
        const successService = createService(success.loader, { defaultTemplate: 'node-v1' });

        await expect(successService.withSandbox(sandbox => sandbox.sandboxId)).resolves.toBe('created-sandbox');
        expect(success.sandboxKill).toHaveBeenCalledTimes(1);

        const failure = createHarness();
        const failureService = createService(failure.loader, { defaultTemplate: 'node-v1' });
        const callbackError = new Error('callback failed');
        await expect(
            failureService.withSandbox('override-template', async () => {
                throw callbackError;
            }),
        ).rejects.toBe(callbackError);
        expect(failure.sandboxCreate).toHaveBeenCalledWith('override-template', expect.any(Object));
        expect(failure.sandboxKill).toHaveBeenCalledTimes(1);
    });

    it('loads and cleans up code-interpreter instances through the separate lazy entrypoint', async () => {
        const harness = createHarness();
        const service = createService(harness.loader, { defaultTimeoutMs: 30_000 });

        await expect(
            service.withCodeInterpreter(interpreter => interpreter.sandboxId, {
                metadata: { kind: 'interpreter' },
            } as CodeInterpreterCreateOptions),
        ).resolves.toBe('created-interpreter');

        expect(harness.loadCodeInterpreterSdk).toHaveBeenCalledTimes(1);
        expect(harness.codeInterpreterCreate).toHaveBeenCalledWith({
            apiUrl: 'https://api.box.test',
            domain: 'box.test',
            validateApiKey: false,
            apiKey: 'module-key',
            metadata: { kind: 'interpreter' },
            timeoutMs: 30_000,
        });
        expect(harness.codeInterpreterKill).toHaveBeenCalledTimes(1);
        expect(harness.loadSandboxSdk).not.toHaveBeenCalled();
    });

    it('settles every shutdown kill once and rejects new operations afterward', async () => {
        const harness = createHarness();
        harness.sandboxKill.mockRejectedValueOnce(new Error('already unavailable'));
        const service = createService(harness.loader);
        await service.create('node-v1');
        await service.createCodeInterpreter();

        await expect(service.onModuleDestroy()).resolves.toBeUndefined();
        await expect(service.onModuleDestroy()).resolves.toBeUndefined();

        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
        expect(harness.codeInterpreterKill).toHaveBeenCalledTimes(1);
        await expect(service.create('node-v1')).rejects.toBeInstanceOf(SandboxServiceClosedError);
    });

    it('waits for a create that finishes during shutdown and kills the unreturned instance', async () => {
        const harness = createHarness();
        const createResult = deferred<SandboxInstance>();
        const lateKill = deferred<boolean>();
        harness.sandboxCreate.mockImplementationOnce(() => createResult.promise);
        harness.sandboxKill.mockImplementationOnce(() => lateKill.promise);
        const service = createService(harness.loader);

        const creating = service.create('node-v1');
        await waitForMock(harness.sandboxCreate);

        let shutdownSettled = false;
        const shutdown = service.onModuleDestroy().then(() => {
            shutdownSettled = true;
        });
        createResult.resolve(harness.sandbox);
        await waitForMock(harness.sandboxKill);

        expect(shutdownSettled).toBe(false);
        lateKill.resolve(true);
        await expect(creating).rejects.toBeInstanceOf(SandboxServiceClosedError);
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
    });

    it('waits for an explicit kill already in flight when shutdown begins', async () => {
        const harness = createHarness();
        const killResult = deferred<boolean>();
        const service = createService(harness.loader);
        const sandbox = await service.create('node-v1');
        harness.sandboxKill.mockImplementationOnce(() => killResult.promise);

        const killing = service.kill(sandbox);
        let shutdownSettled = false;
        const shutdown = service.onModuleDestroy().then(() => {
            shutdownSettled = true;
        });
        await Promise.resolve();

        expect(shutdownSettled).toBe(false);
        killResult.resolve(true);
        await expect(killing).resolves.toBe(true);
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
    });

    it('releases ownership without killing when killOnShutdown is false', async () => {
        const harness = createHarness();
        const service = createService(harness.loader, { killOnShutdown: false });
        const sandbox = await service.create('node-v1');

        await service.onModuleDestroy();

        expect(service.owns(sandbox)).toBe(false);
        expect(harness.sandboxKill).not.toHaveBeenCalled();
    });

    it('retries a lazy load after a loader failure and validates loaded modules', async () => {
        const harness = createHarness();
        const loadFailure = new Error('module temporarily unavailable');
        harness.loadSandboxSdk.mockRejectedValueOnce(loadFailure);
        const service = createService(harness.loader);

        await expect(service.create('node-v1')).rejects.toBe(loadFailure);
        await expect(service.create('node-v1')).resolves.toBe(harness.sandbox);
        expect(harness.loadSandboxSdk).toHaveBeenCalledTimes(2);

        const invalidLoader: SandboxSdkLoader = {
            loadSandboxSdk: async () => ({}) as SandboxSdkModule,
            loadCodeInterpreterSdk: harness.loader.loadCodeInterpreterSdk,
        };
        const invalidService = createService(invalidLoader);
        await expect(invalidService.create('node-v1')).rejects.toBeInstanceOf(SandboxSdkError);
    });

    it('validates module defaults and required identifiers', async () => {
        const harness = createHarness();
        expect(() => createService(harness.loader, { defaultTemplate: ' ' })).toThrow(SandboxConfigurationError);
        expect(() => createService(harness.loader, { defaultTimeoutMs: 0 })).toThrow(SandboxConfigurationError);

        const service = createService(harness.loader);
        await expect(service.create(' ')).rejects.toThrow('template cannot be empty');
        await expect(service.connect(' ')).rejects.toThrow('sandboxId cannot be empty');
    });
});

interface Harness {
    loader: SandboxSdkLoader;
    sandbox: SandboxInstance;
    codeInterpreter: CodeInterpreterInstance;
    sandboxCreate: jest.Mock;
    sandboxConnect: jest.Mock;
    codeInterpreterCreate: jest.Mock;
    sandboxKill: jest.Mock;
    codeInterpreterKill: jest.Mock;
    loadSandboxSdk: jest.Mock;
    loadCodeInterpreterSdk: jest.Mock;
}

function createHarness(): Harness {
    const sandboxKill = jest.fn(async () => true);
    const codeInterpreterKill = jest.fn(async () => true);
    const sandbox = {
        sandboxId: 'created-sandbox',
        kill: sandboxKill,
    } as unknown as SandboxInstance;
    const connectedSandbox = {
        sandboxId: 'connected-sandbox',
        kill: jest.fn(async () => true),
    } as unknown as SandboxInstance;
    const codeInterpreter = {
        sandboxId: 'created-interpreter',
        kill: codeInterpreterKill,
    } as unknown as CodeInterpreterInstance;
    const connectedCodeInterpreter = {
        sandboxId: 'connected-interpreter',
        kill: jest.fn(async () => true),
    } as unknown as CodeInterpreterInstance;

    const sandboxCreate = jest.fn(async () => sandbox);
    const sandboxConnect = jest.fn(async () => connectedSandbox);
    const codeInterpreterCreate = jest.fn(async () => codeInterpreter);
    const codeInterpreterConnect = jest.fn(async () => connectedCodeInterpreter);
    const sandboxSdk = {
        Sandbox: {
            create: sandboxCreate,
            connect: sandboxConnect,
        },
    } as unknown as SandboxSdkModule;
    const codeInterpreterSdk = {
        Sandbox: {
            create: codeInterpreterCreate,
            connect: codeInterpreterConnect,
        },
    } as unknown as CodeInterpreterSdkModule;
    const loadSandboxSdk = jest.fn(async () => sandboxSdk);
    const loadCodeInterpreterSdk = jest.fn(async () => codeInterpreterSdk);

    return {
        loader: { loadSandboxSdk, loadCodeInterpreterSdk },
        sandbox,
        codeInterpreter,
        sandboxCreate,
        sandboxConnect,
        codeInterpreterCreate,
        sandboxKill,
        codeInterpreterKill,
        loadSandboxSdk,
        loadCodeInterpreterSdk,
    };
}

function createService(sdkLoader: SandboxSdkLoader, overrides: Partial<SandboxModuleOptions> = {}): SandboxService {
    return new SandboxService({
        connection: {
            apiUrl: 'https://api.box.test',
            apiKey: 'module-key',
        },
        sdkLoader,
        ...overrides,
    });
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(resolvePromise => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

async function waitForMock(mock: jest.Mock): Promise<void> {
    while (mock.mock.calls.length === 0) {
        await new Promise<void>(resolve => setImmediate(resolve));
    }
}
