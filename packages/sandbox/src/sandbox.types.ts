type A3SBoxModule = typeof import('@a3s-lab/box', { with: { 'resolution-mode': 'import' }});
type A3SCodeInterpreterModule = typeof import('@a3s-lab/box/code-interpreter', { with: {
    'resolution-mode': 'import',
}});
type A3SBoxSandboxClass = A3SBoxModule['Sandbox'];
type A3SCodeInterpreterSandboxClass = A3SCodeInterpreterModule['Sandbox'];

export type A3SConnectionOptions = import('@a3s-lab/box', { with: {
    'resolution-mode': 'import',
}}).A3SConnectionOptions;
export type A3SSandboxConnectionOptions = import('@a3s-lab/box', { with: {
    'resolution-mode': 'import',
}}).A3SSandboxConnectionOptions;
export type SandboxInstance = InstanceType<A3SBoxSandboxClass>;
export type CodeInterpreterInstance = InstanceType<A3SCodeInterpreterSandboxClass>;
export type OwnedSandboxInstance = SandboxInstance | CodeInterpreterInstance;

export type SandboxCreateOptions = NonNullable<Parameters<A3SBoxSandboxClass['create']>[1]>;
export type SandboxConnectOptions = NonNullable<Parameters<A3SBoxSandboxClass['connect']>[1]>;
export type CodeInterpreterCreateOptions = SandboxCreateOptions;
export type CodeInterpreterConnectOptions = NonNullable<Parameters<A3SCodeInterpreterSandboxClass['connect']>[1]>;

export type A3SBoxConnectionConfig = A3SSandboxConnectionOptions;

export interface SandboxSdkModule {
    readonly Sandbox: {
        create(options?: SandboxCreateOptions): Promise<SandboxInstance>;
        create(template: string, options?: SandboxCreateOptions): Promise<SandboxInstance>;
        connect(sandboxId: string, options?: SandboxConnectOptions): Promise<SandboxInstance>;
    };
}

export interface CodeInterpreterSdkModule {
    readonly Sandbox: {
        create(options?: CodeInterpreterCreateOptions): Promise<CodeInterpreterInstance>;
        connect(sandboxId: string, options?: CodeInterpreterConnectOptions): Promise<CodeInterpreterInstance>;
    };
}

/** Injectable loading seam for tests and hosts that customize ESM loading. */
export interface SandboxSdkLoader {
    loadSandboxSdk(): Promise<SandboxSdkModule>;
    loadCodeInterpreterSdk(): Promise<CodeInterpreterSdkModule>;
}

export interface SandboxModuleOptions {
    /** Explicit A3S Box endpoint configuration passed to the first-party SDK. */
    connection: A3SConnectionOptions;
    /** Template used when `SandboxService.create()` receives no template; otherwise the SDK default is used. */
    defaultTemplate?: string;
    /** Default SDK operation timeout in milliseconds when a call omits `timeoutMs`. */
    defaultTimeoutMs?: number;
    /** Kill service-owned instances during Nest shutdown. Defaults to `true`. */
    killOnShutdown?: boolean;
    /** Surface settled shutdown cleanup failures. Defaults to `throw`; use `ignore` only for best-effort shutdown. */
    cleanupFailurePolicy?: 'throw' | 'ignore';
    /** Maximum time to drain managed operations before final cleanup. Defaults to 30 seconds. */
    shutdownTimeoutMs?: number;
    /** Optional lazy loader override, primarily for isolated tests. */
    sdkLoader?: SandboxSdkLoader;
}

export type SandboxCallback<TResult> = (sandbox: SandboxInstance) => TResult | Promise<TResult>;
export type CodeInterpreterCallback<TResult> = (sandbox: CodeInterpreterInstance) => TResult | Promise<TResult>;
