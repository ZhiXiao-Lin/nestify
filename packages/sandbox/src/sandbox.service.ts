import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createA3SBoxConnectionConfig } from './sandbox.connection';
import {
    SandboxCleanupError,
    SandboxConfigurationError,
    SandboxSdkError,
    SandboxServiceClosedError,
    SandboxShutdownTimeoutError,
} from './sandbox.errors';
import { MODULE_OPTIONS_TOKEN } from './sandbox.module-definition';
import type {
    A3SBoxConnectionConfig,
    CodeInterpreterCallback,
    CodeInterpreterConnectOptions,
    CodeInterpreterCreateOptions,
    CodeInterpreterInstance,
    CodeInterpreterSdkModule,
    OwnedSandboxInstance,
    SandboxCallback,
    SandboxConnectOptions,
    SandboxCreateOptions,
    SandboxInstance,
    SandboxModuleOptions,
    SandboxSdkLoader,
    SandboxSdkModule,
} from './sandbox.types';

const NO_ERROR = Symbol('no-error');
const CONNECTION_OPTION_KEYS = ['apiUrl', 'domain', 'apiKey', 'sandboxUrl', 'validateApiKey'] as const;
const MAX_IDENTIFIER_LENGTH = 512;
const IDENTIFIER_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

export const DEFAULT_SANDBOX_SHUTDOWN_TIMEOUT_MS = 30_000;

const DEFAULT_SDK_LOADER: SandboxSdkLoader = {
    async loadSandboxSdk(): Promise<SandboxSdkModule> {
        return (await import('@a3s-lab/box')) as unknown as SandboxSdkModule;
    },
    async loadCodeInterpreterSdk(): Promise<CodeInterpreterSdkModule> {
        return (await import('@a3s-lab/box/code-interpreter')) as unknown as CodeInterpreterSdkModule;
    },
};

@Injectable()
export class SandboxService implements OnModuleDestroy {
    private readonly connection: A3SBoxConnectionConfig;
    private readonly defaultTemplate?: string;
    private readonly defaultTimeoutMs?: number;
    private readonly killOnShutdown: boolean;
    private readonly cleanupFailurePolicy: 'throw' | 'ignore';
    private readonly shutdownTimeoutMs: number;
    private readonly sdkLoader: SandboxSdkLoader;
    private readonly owned = new Set<OwnedSandboxInstance>();
    private readonly inFlight = new Set<Promise<unknown>>();
    private sandboxSdkPromise?: Promise<SandboxSdkModule>;
    private codeInterpreterSdkPromise?: Promise<CodeInterpreterSdkModule>;
    private shutdownPromise?: Promise<void>;
    private readonly shutdownCleanupFailures: unknown[] = [];
    private shuttingDown = false;

    constructor(@Inject(MODULE_OPTIONS_TOKEN) options: SandboxModuleOptions) {
        if (!options || typeof options !== 'object') {
            throw new SandboxConfigurationError('SandboxModule options are required');
        }
        this.connection = createA3SBoxConnectionConfig(options.connection);
        this.defaultTemplate = validateDefaultTemplate(options.defaultTemplate);
        this.defaultTimeoutMs = validateDefaultTimeout(options.defaultTimeoutMs);
        this.killOnShutdown = options.killOnShutdown ?? true;
        if (typeof this.killOnShutdown !== 'boolean') {
            throw new SandboxConfigurationError('killOnShutdown must be a boolean');
        }
        this.cleanupFailurePolicy = validateCleanupFailurePolicy(options.cleanupFailurePolicy);
        this.shutdownTimeoutMs = validateTimeout(
            'shutdownTimeoutMs',
            options.shutdownTimeoutMs ?? DEFAULT_SANDBOX_SHUTDOWN_TIMEOUT_MS,
        );
        this.sdkLoader = normalizeSdkLoader(options.sdkLoader ?? DEFAULT_SDK_LOADER);
    }

    create(options?: SandboxCreateOptions): Promise<SandboxInstance>;
    create(template: string, options?: SandboxCreateOptions): Promise<SandboxInstance>;
    create(template: undefined, options?: SandboxCreateOptions): Promise<SandboxInstance>;
    async create(
        templateOrOptions?: string | SandboxCreateOptions,
        options?: SandboxCreateOptions,
    ): Promise<SandboxInstance> {
        this.assertActive();
        return this.trackInFlight(this.createSandbox(templateOrOptions, options));
    }

    private async createSandbox(
        templateOrOptions?: string | SandboxCreateOptions,
        options?: SandboxCreateOptions,
    ): Promise<SandboxInstance> {
        const explicitTemplate =
            typeof templateOrOptions === 'string' ? requiredValue('template', templateOrOptions) : undefined;
        const resolvedTemplate = explicitTemplate ?? this.defaultTemplate;
        const createOptions = typeof templateOrOptions === 'string' ? options : (templateOrOptions ?? options);
        const sdk = await this.loadSandboxSdk();
        const connectionOptions = this.withConnection(createOptions);
        const sandbox = resolvedTemplate
            ? await sdk.Sandbox.create(resolvedTemplate, connectionOptions)
            : await sdk.Sandbox.create(connectionOptions);
        return this.trackCreated(sandbox);
    }

    async connect(sandboxId: string, options?: SandboxConnectOptions): Promise<SandboxInstance> {
        this.assertActive();
        const resolvedId = requiredValue('sandboxId', sandboxId);
        return this.trackInFlight(this.connectSandbox(resolvedId, options));
    }

    private async connectSandbox(sandboxId: string, options?: SandboxConnectOptions): Promise<SandboxInstance> {
        const sdk = await this.loadSandboxSdk();
        return validateOwnedInstance(
            await sdk.Sandbox.connect(sandboxId, this.withConnection(options)),
            '@a3s-lab/box Sandbox.connect',
        );
    }

    async createCodeInterpreter(options?: CodeInterpreterCreateOptions): Promise<CodeInterpreterInstance> {
        this.assertActive();
        return this.trackInFlight(this.createCodeInterpreterSandbox(options));
    }

    private async createCodeInterpreterSandbox(
        options?: CodeInterpreterCreateOptions,
    ): Promise<CodeInterpreterInstance> {
        const sdk = await this.loadCodeInterpreterSdk();
        const sandbox = await sdk.Sandbox.create(this.withConnection(options));
        return this.trackCreated(sandbox);
    }

    async connectCodeInterpreter(
        sandboxId: string,
        options?: CodeInterpreterConnectOptions,
    ): Promise<CodeInterpreterInstance> {
        this.assertActive();
        const resolvedId = requiredValue('sandboxId', sandboxId);
        return this.trackInFlight(this.connectCodeInterpreterSandbox(resolvedId, options));
    }

    private async connectCodeInterpreterSandbox(
        sandboxId: string,
        options?: CodeInterpreterConnectOptions,
    ): Promise<CodeInterpreterInstance> {
        const sdk = await this.loadCodeInterpreterSdk();
        return validateOwnedInstance(
            await sdk.Sandbox.connect(sandboxId, this.withConnection(options)),
            '@a3s-lab/box/code-interpreter Sandbox.connect',
        );
    }

    async withSandbox<TResult>(callback: SandboxCallback<TResult>, options?: SandboxCreateOptions): Promise<TResult>;
    async withSandbox<TResult>(
        template: string,
        callback: SandboxCallback<TResult>,
        options?: SandboxCreateOptions,
    ): Promise<TResult>;
    async withSandbox<TResult>(
        templateOrCallback: string | SandboxCallback<TResult>,
        callbackOrOptions?: SandboxCallback<TResult> | SandboxCreateOptions,
        options?: SandboxCreateOptions,
    ): Promise<TResult> {
        this.assertActive();
        const operation = this.withSandboxScope(templateOrCallback, callbackOrOptions, options);
        return this.trackInFlight(operation);
    }

    private async withSandboxScope<TResult>(
        templateOrCallback: string | SandboxCallback<TResult>,
        callbackOrOptions?: SandboxCallback<TResult> | SandboxCreateOptions,
        options?: SandboxCreateOptions,
    ): Promise<TResult> {
        const template = typeof templateOrCallback === 'string' ? templateOrCallback : undefined;
        const callback = typeof templateOrCallback === 'function' ? templateOrCallback : callbackOrOptions;
        if (typeof callback !== 'function') {
            throw new SandboxConfigurationError('withSandbox requires a callback');
        }
        const createOptions =
            typeof templateOrCallback === 'function'
                ? (callbackOrOptions as SandboxCreateOptions | undefined)
                : options;
        const sandbox =
            template === undefined ? await this.create(createOptions) : await this.create(template, createOptions);
        return this.runWithCleanup(sandbox, callback);
    }

    async withCodeInterpreter<TResult>(
        callback: CodeInterpreterCallback<TResult>,
        options?: CodeInterpreterCreateOptions,
    ): Promise<TResult> {
        this.assertActive();
        return this.trackInFlight(this.withCodeInterpreterScope(callback, options));
    }

    private async withCodeInterpreterScope<TResult>(
        callback: CodeInterpreterCallback<TResult>,
        options?: CodeInterpreterCreateOptions,
    ): Promise<TResult> {
        if (typeof callback !== 'function') {
            throw new SandboxConfigurationError('withCodeInterpreter requires a callback');
        }
        const sandbox = await this.createCodeInterpreter(options);
        return this.runWithCleanup(sandbox, callback);
    }

    /** Stop automatic cleanup without killing the instance. */
    release(sandbox: OwnedSandboxInstance): boolean {
        return this.owned.delete(sandbox);
    }

    /** Whether this service currently owns an instance returned by one of its create methods. */
    owns(sandbox: OwnedSandboxInstance): boolean {
        return this.owned.has(sandbox);
    }

    /** Kill an owned instance exactly once and release it from shutdown cleanup. */
    async kill(sandbox: OwnedSandboxInstance): Promise<boolean> {
        return this.trackInFlight(this.killOwned(sandbox));
    }

    private async killOwned(sandbox: OwnedSandboxInstance): Promise<boolean> {
        if (!this.owned.delete(sandbox)) {
            return false;
        }
        try {
            return await sandbox.kill();
        } catch (error) {
            this.owned.add(sandbox);
            throw error;
        }
    }

    onModuleDestroy(): Promise<void> {
        return this.shutdown();
    }

    /** Stop new operations, drain managed scopes, and dispose remaining owned instances exactly once. */
    shutdown(): Promise<void> {
        if (!this.shutdownPromise) {
            this.shuttingDown = true;
            this.shutdownPromise = this.cleanupOnShutdown();
        }
        return this.shutdownPromise;
    }

    /** Whether shutdown has started. A closed service never becomes active again. */
    get isClosed(): boolean {
        return this.shuttingDown;
    }

    private async cleanupOnShutdown(): Promise<void> {
        try {
            await withTimeout(this.drainInFlight(), this.shutdownTimeoutMs);
        } catch (error) {
            this.shutdownCleanupFailures.push(error);
        }
        const instances = [...this.owned];
        this.owned.clear();
        if (this.killOnShutdown) {
            const results = await Promise.allSettled(
                instances.map(instance => Promise.resolve().then(() => instance.kill())),
            );
            for (const [index, result] of results.entries()) {
                if (result.status === 'rejected') {
                    const instance = instances[index];
                    if (instance) this.owned.add(instance);
                    this.shutdownCleanupFailures.push(result.reason);
                }
            }
        }
        if (this.cleanupFailurePolicy === 'throw' && this.shutdownCleanupFailures.length > 0) {
            throw new SandboxCleanupError(this.shutdownCleanupFailures);
        }
    }

    private async drainInFlight(): Promise<void> {
        while (this.inFlight.size > 0) {
            await Promise.allSettled([...this.inFlight]);
        }
    }

    private async runWithCleanup<TResult, TInstance extends OwnedSandboxInstance>(
        sandbox: TInstance,
        callback: (sandbox: TInstance) => TResult | Promise<TResult>,
    ): Promise<TResult> {
        let callbackError: unknown | typeof NO_ERROR = NO_ERROR;
        let result: TResult | undefined;
        try {
            result = await callback(sandbox);
        } catch (error) {
            callbackError = error;
        }

        let cleanupError: unknown | typeof NO_ERROR = NO_ERROR;
        try {
            await this.kill(sandbox);
        } catch (error) {
            cleanupError = error;
        }

        if (callbackError !== NO_ERROR) {
            if (cleanupError !== NO_ERROR) {
                throw new AggregateError(
                    [callbackError, cleanupError],
                    'Sandbox callback and automatic cleanup both failed',
                );
            }
            throw callbackError;
        }
        if (cleanupError !== NO_ERROR) {
            throw cleanupError;
        }
        return result as TResult;
    }

    private async trackCreated<TInstance extends OwnedSandboxInstance>(sandbox: TInstance): Promise<TInstance> {
        validateOwnedInstance(sandbox, 'A3S Box create');
        if (!this.shuttingDown) {
            this.owned.add(sandbox);
            return sandbox;
        }
        const [cleanup] = await Promise.allSettled([Promise.resolve().then(() => sandbox.kill())]);
        if (cleanup.status === 'rejected') {
            this.owned.add(sandbox);
            throw new SandboxServiceClosedError({ cause: cleanup.reason, unreleasedInstance: sandbox });
        }
        throw new SandboxServiceClosedError();
    }

    private trackInFlight<TResult>(operation: Promise<TResult>): Promise<TResult> {
        this.inFlight.add(operation);
        void operation.then(
            () => this.inFlight.delete(operation),
            () => this.inFlight.delete(operation),
        );
        return operation;
    }

    private withConnection<TOptions extends object>(options?: TOptions): TOptions {
        let merged: Record<string, unknown>;
        try {
            merged = options ? { ...(options as unknown as Record<string, unknown>) } : {};
        } catch (error) {
            throw new SandboxConfigurationError('Sandbox operation options could not be read', { cause: error });
        }
        for (const key of CONNECTION_OPTION_KEYS) {
            delete merged[key];
        }
        if (merged.timeoutMs === undefined && this.defaultTimeoutMs !== undefined) {
            merged.timeoutMs = this.defaultTimeoutMs;
        }
        if (merged.timeoutMs !== undefined) {
            merged.timeoutMs = validateTimeout('timeoutMs', merged.timeoutMs);
        }
        return Object.freeze({ ...merged, ...this.connection }) as unknown as TOptions;
    }

    private assertActive(): void {
        if (this.shuttingDown) {
            throw new SandboxServiceClosedError();
        }
    }

    private loadSandboxSdk(): Promise<SandboxSdkModule> {
        if (!this.sandboxSdkPromise) {
            this.sandboxSdkPromise = invokeSdkLoader(() => this.sdkLoader.loadSandboxSdk())
                .then(validateSandboxSdk)
                .catch(error => {
                    this.sandboxSdkPromise = undefined;
                    throw normalizeSdkLoadError('@a3s-lab/box', error);
                });
        }
        return this.sandboxSdkPromise;
    }

    private loadCodeInterpreterSdk(): Promise<CodeInterpreterSdkModule> {
        if (!this.codeInterpreterSdkPromise) {
            this.codeInterpreterSdkPromise = invokeSdkLoader(() => this.sdkLoader.loadCodeInterpreterSdk())
                .then(validateCodeInterpreterSdk)
                .catch(error => {
                    this.codeInterpreterSdkPromise = undefined;
                    throw normalizeSdkLoadError('@a3s-lab/box/code-interpreter', error);
                });
        }
        return this.codeInterpreterSdkPromise;
    }
}

function validateDefaultTemplate(template: string | undefined): string | undefined {
    if (template === undefined) {
        return undefined;
    }
    return requiredValue('defaultTemplate', template);
}

function validateDefaultTimeout(timeoutMs: number | undefined): number | undefined {
    if (timeoutMs === undefined) {
        return undefined;
    }
    return validateTimeout('defaultTimeoutMs', timeoutMs);
}

function requiredValue(name: string, value: string | undefined): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new SandboxConfigurationError(`${name} cannot be empty`);
    }
    const normalized = value.trim();
    if (normalized.length > MAX_IDENTIFIER_LENGTH) {
        throw new SandboxConfigurationError(`${name} cannot exceed ${MAX_IDENTIFIER_LENGTH} characters`);
    }
    if (IDENTIFIER_CONTROL_CHARACTERS.test(normalized)) {
        throw new SandboxConfigurationError(`${name} cannot contain control characters`);
    }
    return normalized;
}

function validateTimeout(name: string, timeoutMs: unknown): number {
    if (!Number.isSafeInteger(timeoutMs) || (timeoutMs as number) <= 0) {
        throw new SandboxConfigurationError(`${name} must be a positive safe integer`);
    }
    return timeoutMs as number;
}

function validateCleanupFailurePolicy(policy: SandboxModuleOptions['cleanupFailurePolicy']): 'throw' | 'ignore' {
    if (policy === undefined) return 'throw';
    if (policy !== 'throw' && policy !== 'ignore') {
        throw new SandboxConfigurationError('cleanupFailurePolicy must be either throw or ignore');
    }
    return policy;
}

function normalizeSdkLoader(loader: SandboxSdkLoader): SandboxSdkLoader {
    if (
        !loader ||
        typeof loader !== 'object' ||
        typeof loader.loadSandboxSdk !== 'function' ||
        typeof loader.loadCodeInterpreterSdk !== 'function'
    ) {
        throw new SandboxConfigurationError('sdkLoader must provide loadSandboxSdk and loadCodeInterpreterSdk');
    }
    return Object.freeze({
        loadSandboxSdk: loader.loadSandboxSdk.bind(loader),
        loadCodeInterpreterSdk: loader.loadCodeInterpreterSdk.bind(loader),
    });
}

function invokeSdkLoader<TModule>(loader: () => Promise<TModule>): Promise<TModule> {
    try {
        return Promise.resolve(loader());
    } catch (error) {
        return Promise.reject(error);
    }
}

async function withTimeout(operation: Promise<void>, timeoutMs: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SandboxShutdownTimeoutError(timeoutMs)), timeoutMs);
    });
    try {
        await Promise.race([operation, timeout]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

function normalizeSdkLoadError(entrypoint: string, error: unknown): SandboxSdkError {
    return error instanceof SandboxSdkError
        ? error
        : new SandboxSdkError(`Failed to load the ${entrypoint} SDK entrypoint`, { cause: error });
}

function validateOwnedInstance<TInstance extends OwnedSandboxInstance>(
    instance: TInstance,
    operation: string,
): TInstance {
    if (!instance || typeof instance !== 'object' || typeof instance.kill !== 'function') {
        throw new SandboxSdkError(`${operation} did not return a native sandbox instance with kill()`);
    }
    return instance;
}

function validateSandboxSdk(sdk: SandboxSdkModule): SandboxSdkModule {
    if (
        !sdk ||
        typeof sdk !== 'object' ||
        !sdk.Sandbox ||
        typeof sdk.Sandbox.create !== 'function' ||
        typeof sdk.Sandbox.connect !== 'function'
    ) {
        throw new SandboxSdkError('The loaded @a3s-lab/box module does not expose Sandbox.create/connect');
    }
    return sdk;
}

function validateCodeInterpreterSdk(sdk: CodeInterpreterSdkModule): CodeInterpreterSdkModule {
    if (
        !sdk ||
        typeof sdk !== 'object' ||
        !sdk.Sandbox ||
        typeof sdk.Sandbox.create !== 'function' ||
        typeof sdk.Sandbox.connect !== 'function'
    ) {
        throw new SandboxSdkError(
            'The loaded @a3s-lab/box/code-interpreter module does not expose Sandbox.create/connect',
        );
    }
    return sdk;
}
