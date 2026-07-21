import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createA3SBoxConnectionConfig } from './sandbox.connection';
import { SandboxConfigurationError, SandboxSdkError, SandboxServiceClosedError } from './sandbox.errors';
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
    private readonly sdkLoader: SandboxSdkLoader;
    private readonly owned = new Set<OwnedSandboxInstance>();
    private readonly inFlight = new Set<Promise<unknown>>();
    private sandboxSdkPromise?: Promise<SandboxSdkModule>;
    private codeInterpreterSdkPromise?: Promise<CodeInterpreterSdkModule>;
    private shutdownPromise?: Promise<void>;
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
        this.sdkLoader = options.sdkLoader ?? DEFAULT_SDK_LOADER;
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
        const sdk = await this.loadSandboxSdk();
        return sdk.Sandbox.connect(resolvedId, this.withConnection(options));
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
        const sdk = await this.loadCodeInterpreterSdk();
        return sdk.Sandbox.connect(resolvedId, this.withConnection(options));
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
            if (!this.shuttingDown) {
                this.owned.add(sandbox);
            }
            throw error;
        }
    }

    onModuleDestroy(): Promise<void> {
        if (!this.shutdownPromise) {
            this.shuttingDown = true;
            const instances = [...this.owned];
            const inFlight = [...this.inFlight];
            this.owned.clear();
            this.shutdownPromise = this.cleanupOnShutdown(instances, inFlight);
        }
        return this.shutdownPromise;
    }

    private async cleanupOnShutdown(instances: OwnedSandboxInstance[], inFlight: Promise<unknown>[]): Promise<void> {
        const shutdownKills = this.killOnShutdown
            ? instances.map(instance => Promise.resolve().then(() => instance.kill()))
            : [];
        await Promise.allSettled([...inFlight, ...shutdownKills]);
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
        if (!this.shuttingDown) {
            this.owned.add(sandbox);
            return sandbox;
        }
        await Promise.allSettled([Promise.resolve().then(() => sandbox.kill())]);
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
        const merged: Record<string, unknown> = options ? { ...(options as unknown as Record<string, unknown>) } : {};
        for (const key of CONNECTION_OPTION_KEYS) {
            delete merged[key];
        }
        if (merged.timeoutMs === undefined && this.defaultTimeoutMs !== undefined) {
            merged.timeoutMs = this.defaultTimeoutMs;
        }
        return { ...merged, ...this.connection } as unknown as TOptions;
    }

    private assertActive(): void {
        if (this.shuttingDown) {
            throw new SandboxServiceClosedError();
        }
    }

    private loadSandboxSdk(): Promise<SandboxSdkModule> {
        if (!this.sandboxSdkPromise) {
            this.sandboxSdkPromise = this.sdkLoader
                .loadSandboxSdk()
                .then(validateSandboxSdk)
                .catch(error => {
                    this.sandboxSdkPromise = undefined;
                    throw error;
                });
        }
        return this.sandboxSdkPromise;
    }

    private loadCodeInterpreterSdk(): Promise<CodeInterpreterSdkModule> {
        if (!this.codeInterpreterSdkPromise) {
            this.codeInterpreterSdkPromise = this.sdkLoader
                .loadCodeInterpreterSdk()
                .then(validateCodeInterpreterSdk)
                .catch(error => {
                    this.codeInterpreterSdkPromise = undefined;
                    throw error;
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
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        throw new SandboxConfigurationError('defaultTimeoutMs must be a positive safe integer');
    }
    return timeoutMs;
}

function requiredValue(name: string, value: string | undefined): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new SandboxConfigurationError(`${name} cannot be empty`);
    }
    return value;
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
