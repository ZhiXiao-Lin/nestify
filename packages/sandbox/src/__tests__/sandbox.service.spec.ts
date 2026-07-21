import {
    SandboxCleanupError,
    SandboxConfigurationError,
    SandboxSdkError,
    SandboxServiceClosedError,
    SandboxShutdownTimeoutError,
} from '../sandbox.errors';
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

    it('connects to an unowned code-interpreter instance through the native entrypoint', async () => {
        const harness = createHarness();
        const service = createService(harness.loader);

        const connected = await service.connectCodeInterpreter('  interpreter-id  ', {
            timeoutMs: 15_000,
        });

        expect(connected).toBe(harness.connectedCodeInterpreter);
        expect(service.owns(connected)).toBe(false);
        expect(harness.codeInterpreterConnect).toHaveBeenCalledWith(
            'interpreter-id',
            expect.objectContaining({ timeoutMs: 15_000, apiUrl: 'https://api.box.test' }),
        );
    });

    it('settles every shutdown kill, reports failures, and rejects new operations afterward', async () => {
        const harness = createHarness();
        const killFailure = new Error('already unavailable');
        harness.sandboxKill.mockRejectedValueOnce(killFailure);
        const service = createService(harness.loader);
        const sandbox = await service.create('node-v1');
        await service.createCodeInterpreter();

        const shutdown = service.onModuleDestroy();
        await expect(shutdown).rejects.toMatchObject({
            name: 'SandboxCleanupError',
            errors: [killFailure],
        });
        expect(service.onModuleDestroy()).toBe(shutdown);
        await expect(service.onModuleDestroy()).rejects.toBeInstanceOf(SandboxCleanupError);

        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
        expect(harness.codeInterpreterKill).toHaveBeenCalledTimes(1);
        expect(service.owns(sandbox)).toBe(true);
        expect(service.isClosed).toBe(true);
        await expect(service.create('node-v1')).rejects.toBeInstanceOf(SandboxServiceClosedError);
        await expect(service.kill(sandbox)).resolves.toBe(true);
        expect(service.owns(sandbox)).toBe(false);
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

        await expect(service.create('node-v1')).rejects.toMatchObject({
            name: 'SandboxSdkError',
            cause: loadFailure,
        });
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
        expect(() => createService(harness.loader, { shutdownTimeoutMs: 0 })).toThrow(SandboxConfigurationError);
        expect(() =>
            createService(harness.loader, {
                cleanupFailurePolicy: 'invalid' as SandboxModuleOptions['cleanupFailurePolicy'],
            }),
        ).toThrow(SandboxConfigurationError);
        expect(() => createService(harness.loader, { killOnShutdown: 'yes' as unknown as boolean })).toThrow(
            SandboxConfigurationError,
        );

        const service = createService(harness.loader);
        await expect(service.create(' ')).rejects.toThrow('template cannot be empty');
        await expect(service.connect(' ')).rejects.toThrow('sandboxId cannot be empty');
        await expect(service.connect(`box-${'x'.repeat(512)}`)).rejects.toThrow('cannot exceed 512 characters');
        await expect(service.connect('box\nheader')).rejects.toThrow('cannot contain control characters');
    });

    it('drains the entire withSandbox callback scope before shutdown cleanup', async () => {
        const harness = createHarness();
        const callbackStarted = deferred<void>();
        const callbackResult = deferred<string>();
        const service = createService(harness.loader);

        const operation = service.withSandbox('node-v1', async () => {
            callbackStarted.resolve(undefined);
            return callbackResult.promise;
        });
        await callbackStarted.promise;

        let shutdownSettled = false;
        const shutdown = service.shutdown().finally(() => {
            shutdownSettled = true;
        });
        await Promise.resolve();

        expect(shutdownSettled).toBe(false);
        expect(harness.sandboxKill).not.toHaveBeenCalled();

        callbackResult.resolve('complete');
        await expect(operation).resolves.toBe('complete');
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
    });

    it('retries a managed-scope kill that fails while shutdown is draining', async () => {
        const harness = createHarness();
        const callbackStarted = deferred<void>();
        const callbackResult = deferred<string>();
        const killFailure = new Error('first kill failed');
        harness.sandboxKill.mockRejectedValueOnce(killFailure).mockResolvedValueOnce(true);
        const service = createService(harness.loader);

        const operation = service.withSandbox('node-v1', async () => {
            callbackStarted.resolve(undefined);
            return callbackResult.promise;
        });
        await callbackStarted.promise;
        const shutdown = service.shutdown();
        callbackResult.resolve('ignored');

        await expect(operation).rejects.toBe(killFailure);
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.sandboxKill).toHaveBeenCalledTimes(2);
    });

    it('waits for an unowned connect already in flight without killing its result', async () => {
        const harness = createHarness();
        const connectResult = deferred<SandboxInstance>();
        harness.sandboxConnect.mockImplementationOnce(() => connectResult.promise);
        const service = createService(harness.loader);

        const connecting = service.connect('existing');
        await waitForMock(harness.sandboxConnect);
        let shutdownSettled = false;
        const shutdown = service.shutdown().finally(() => {
            shutdownSettled = true;
        });
        await Promise.resolve();

        expect(shutdownSettled).toBe(false);
        connectResult.resolve(harness.sandbox);
        await expect(connecting).resolves.toBe(harness.sandbox);
        await expect(shutdown).resolves.toBeUndefined();
        expect(harness.sandboxKill).not.toHaveBeenCalled();
    });

    it('reports a late-create cleanup failure to both the create and shutdown callers', async () => {
        const harness = createHarness();
        const createResult = deferred<SandboxInstance>();
        const killFailure = new Error('late cleanup failed');
        harness.sandboxCreate.mockImplementationOnce(() => createResult.promise);
        harness.sandboxKill.mockRejectedValue(killFailure);
        const service = createService(harness.loader);

        const creating = service.create('node-v1');
        await waitForMock(harness.sandboxCreate);
        const shutdown = service.shutdown();
        createResult.resolve(harness.sandbox);

        await expect(creating).rejects.toMatchObject({
            name: 'SandboxServiceClosedError',
            cause: killFailure,
            unreleasedInstance: harness.sandbox,
        });
        await expect(shutdown).rejects.toMatchObject({
            name: 'SandboxCleanupError',
            errors: [killFailure],
        });
        expect(service.owns(harness.sandbox)).toBe(true);
        expect(harness.sandboxKill).toHaveBeenCalledTimes(2);
    });

    it('bounds shutdown draining and still performs final owned cleanup', async () => {
        const harness = createHarness();
        const callbackStarted = deferred<void>();
        const callbackResult = deferred<string>();
        const service = createService(harness.loader, { shutdownTimeoutMs: 10 });

        const operation = service.withSandbox('node-v1', async () => {
            callbackStarted.resolve(undefined);
            return callbackResult.promise;
        });
        await callbackStarted.promise;

        let shutdownError: unknown;
        try {
            await service.shutdown();
        } catch (error) {
            shutdownError = error;
        }
        expect(shutdownError).toBeInstanceOf(SandboxCleanupError);
        expect((shutdownError as AggregateError).errors).toEqual([expect.any(SandboxShutdownTimeoutError)]);
        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);

        callbackResult.resolve('eventually complete');
        await expect(operation).resolves.toBe('eventually complete');
    });

    it('supports explicit best-effort shutdown cleanup', async () => {
        const harness = createHarness();
        harness.sandboxKill.mockRejectedValueOnce(new Error('unavailable'));
        const service = createService(harness.loader, { cleanupFailurePolicy: 'ignore' });
        await service.create('node-v1');

        await expect(service.shutdown()).resolves.toBeUndefined();
        await expect(service.shutdown()).resolves.toBeUndefined();
        expect(harness.sandboxKill).toHaveBeenCalledTimes(1);
    });

    it('preserves callback and cleanup failures without losing either cause', async () => {
        const harness = createHarness();
        const callbackFailure = new Error('callback failed');
        const cleanupFailure = new Error('cleanup failed');
        harness.sandboxKill.mockRejectedValueOnce(cleanupFailure);
        const service = createService(harness.loader);

        await expect(
            service.withSandbox('node-v1', async () => {
                throw callbackFailure;
            }),
        ).rejects.toMatchObject({
            name: 'AggregateError',
            errors: [callbackFailure, cleanupFailure],
        });
    });

    it('surfaces automatic cleanup failure after a successful callback', async () => {
        const harness = createHarness();
        const cleanupFailure = new Error('cleanup failed');
        harness.sandboxKill.mockRejectedValueOnce(cleanupFailure);
        const service = createService(harness.loader);

        await expect(service.withSandbox('node-v1', () => 'result')).rejects.toBe(cleanupFailure);
        expect(service.owns(harness.sandbox)).toBe(true);
    });

    it('validates callbacks and operation options before invoking an SDK operation', async () => {
        const harness = createHarness();
        const service = createService(harness.loader);

        await expect(
            (service.withSandbox as unknown as (template: string) => Promise<unknown>)('node-v1'),
        ).rejects.toThrow('withSandbox requires a callback');
        await expect(service.withCodeInterpreter(undefined as never)).rejects.toThrow(
            'withCodeInterpreter requires a callback',
        );
        await expect(service.create('node-v1', { timeoutMs: 0 } as SandboxCreateOptions)).rejects.toThrow(
            'timeoutMs must be a positive safe integer',
        );

        const readFailure = new Error('getter failed');
        const unreadable = Object.defineProperty({}, 'metadata', {
            enumerable: true,
            get: () => {
                throw readFailure;
            },
        });
        await expect(service.create('node-v1', unreadable as SandboxCreateOptions)).rejects.toMatchObject({
            name: 'SandboxConfigurationError',
            cause: readFailure,
        });
    });

    it('normalizes templates and freezes a fresh SDK option object', async () => {
        const harness = createHarness();
        const service = createService(harness.loader);
        const callerOptions = { metadata: { source: 'caller' } } as SandboxCreateOptions;

        await service.create('  node-v1  ', callerOptions);

        const passedOptions = harness.sandboxCreate.mock.calls[0]?.[1] as SandboxCreateOptions;
        expect(harness.sandboxCreate).toHaveBeenCalledWith('node-v1', passedOptions);
        expect(passedOptions).not.toBe(callerOptions);
        expect(Object.isFrozen(passedOptions)).toBe(true);
        expect(Object.isFrozen(callerOptions)).toBe(false);
    });

    it('wraps synchronous loader failures and rejects malformed SDK results', async () => {
        const harness = createHarness();
        const syncFailure = new Error('sync import failed');
        const syncLoader: SandboxSdkLoader = {
            loadSandboxSdk: () => {
                throw syncFailure;
            },
            loadCodeInterpreterSdk: harness.loader.loadCodeInterpreterSdk,
        };
        await expect(createService(syncLoader).create('node-v1')).rejects.toMatchObject({
            name: 'SandboxSdkError',
            cause: syncFailure,
        });

        harness.sandboxCreate.mockResolvedValueOnce({});
        await expect(createService(harness.loader).create('node-v1')).rejects.toThrow(
            'did not return a native sandbox instance',
        );

        const malformedCodeLoader: SandboxSdkLoader = {
            loadSandboxSdk: harness.loader.loadSandboxSdk,
            loadCodeInterpreterSdk: async () => ({}) as CodeInterpreterSdkModule,
        };
        await expect(createService(malformedCodeLoader).createCodeInterpreter()).rejects.toThrow(
            '@a3s-lab/box/code-interpreter',
        );
    });

    it('rejects missing options and malformed custom loaders during construction', () => {
        const harness = createHarness();
        expect(() => new SandboxService(undefined as unknown as SandboxModuleOptions)).toThrow(
            'SandboxModule options are required',
        );
        expect(() => createService({} as SandboxSdkLoader)).toThrow(
            'sdkLoader must provide loadSandboxSdk and loadCodeInterpreterSdk',
        );
        expect(() => createService(harness.loader, { shutdownTimeoutMs: Number.MAX_SAFE_INTEGER + 1 })).toThrow(
            SandboxConfigurationError,
        );
    });
});

interface Harness {
    loader: SandboxSdkLoader;
    sandbox: SandboxInstance;
    codeInterpreter: CodeInterpreterInstance;
    connectedCodeInterpreter: CodeInterpreterInstance;
    sandboxCreate: jest.Mock;
    sandboxConnect: jest.Mock;
    codeInterpreterCreate: jest.Mock;
    codeInterpreterConnect: jest.Mock;
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
        connectedCodeInterpreter,
        sandboxCreate,
        sandboxConnect,
        codeInterpreterCreate,
        codeInterpreterConnect,
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
