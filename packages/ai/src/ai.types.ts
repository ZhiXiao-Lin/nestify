import type {
    A3sCodeError,
    A3sCodeErrorCode,
    Agent,
    AgentEvent,
    AgentResult,
    EventEnvelopeV1,
    Session,
    SessionOptions,
    SessionRequestOptions,
} from '@a3s-lab/code';
import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';

/** Injection token for the resolved module options. */
export const AI_MODULE_OPTIONS = Symbol.for('@a3s-lab/ai/module-options');

/** The native agent instance created by `@a3s-lab/code`. */
export type AiAgent = Agent;

/** A workspace-bound native A3S Code session. */
export type AiSession = Session;

/** Native per-session configuration. */
export type AiSessionOptions = SessionOptions;

/** Object-shaped request form recommended for durable integrations. */
export type AiSessionRequestOptions = SessionRequestOptions;

/** The durable prompt request accepted by A3S Code. */
export type AiSessionRequest = string | AiSessionRequestOptions;

/** The complete result returned by a non-streaming run. */
export type AiRunResult = AgentResult;

/** A live event as projected by the native Node SDK. */
export type AiAgentEvent = AgentEvent;

/** The stable, lossless version-one event envelope. */
export type AiEventEnvelopeV1<TPayload = unknown, TMetadata = unknown> = EventEnvelopeV1<TPayload, TMetadata>;

/** Native SDK error with a stable machine-readable code. */
export type AiError = A3sCodeError;

/** Stable error codes exposed by the native SDK. */
export type AiErrorCode = A3sCodeErrorCode;

/** Minimal runtime shape used by the wrapper and by tests. */
export interface AiRuntime {
    readonly Agent: {
        create(configSource: string): Promise<AiAgent>;
    };
}

/** Loads the native SDK. It is invoked only when initialization is requested. */
export type AiRuntimeLoader = () => Promise<AiRuntime>;

export interface AiModuleOptions {
    /** ACL file path or inline ACL source accepted by `Agent.create`. */
    configSource: string;
    /** Initialize during `onModuleInit` instead of on first use. Defaults to false. */
    eager?: boolean;
    /** Make the dynamic module global. Defaults to false. */
    isGlobal?: boolean;
    /** Override native runtime loading, primarily for tests or custom loaders. */
    runtimeLoader?: AiRuntimeLoader;
}

export interface AiModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /** Make the dynamic module global. Defaults to false. */
    isGlobal?: boolean;
    inject?: FactoryProvider['inject'];
    useFactory: (...args: any[]) => AiModuleOptions | Promise<AiModuleOptions>;
}

/** Object-shaped options for a disposable one-run session. */
export interface AiInvocationOptions {
    workspace: string;
    request: AiSessionRequest;
    sessionOptions?: AiSessionOptions;
}
