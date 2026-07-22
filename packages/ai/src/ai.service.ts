import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
    AiConfigurationError,
    AiOperationAbortedError,
    AiResourceCleanupError,
    AiSdkContractError,
    AiServiceClosedError,
} from './ai.errors';
import { normalizeAiModuleOptions } from './ai.options';
import {
    AI_MODULE_OPTIONS,
    type AiAgent,
    type AiAgentEvent,
    type AiInvocationOptions,
    type AiModuleOptions,
    type AiRunResult,
    type AiRuntime,
    type AiSession,
    type AiSessionCallback,
    type AiSessionOptions,
    type AiSessionRequest,
    type AiWorkerAgentSpec,
} from './ai.types';

const NO_ERROR = Symbol('no-error');
const REQUIRED_AGENT_METHODS = [
    'sessionAsync',
    'resumeSessionAsync',
    'replaceSessionAsync',
    'sessionForAgentAsync',
    'sessionForWorkerAsync',
    'listSessions',
    'closeSession',
    'close',
] as const;
const REQUIRED_SESSION_METHODS = [
    'send',
    'stream',
    'closeAsync',
    'cancelAsync',
    'cancelRun',
    'currentRun',
] as const;

interface NormalizedInvocation {
    workspace: string;
    request: AiSessionRequest;
    sessionOptions?: AiSessionOptions;
    signal?: AbortSignal;
}

const defaultRuntimeLoader = async (): Promise<AiRuntime> => import('@a3s-lab/code');

@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
    private readonly options: Readonly<AiModuleOptions>;
    private readonly sessionAcquisitions = new Set<Promise<unknown>>();
    private agent?: AiAgent;
    private initialization?: Promise<AiAgent>;
    private shutdownPromise?: Promise<void>;
    private shuttingDown = false;

    constructor(@Inject(AI_MODULE_OPTIONS) options: AiModuleOptions) {
        this.options = normalizeAiModuleOptions(options);
    }

    async onModuleInit(): Promise<void> {
        if (this.options.eager === true) {
            await this.ready();
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.shutdown();
    }

    /** Whether the native Agent has completed initialization. */
    get isReady(): boolean {
        return this.agent !== undefined && !this.shuttingDown;
    }

    /** Whether shutdown has begun. Once true, the service cannot be restarted. */
    get isShuttingDown(): boolean {
        return this.shuttingDown;
    }

    /** Ensure that the native Agent has been created. Safe to call repeatedly. */
    async ready(): Promise<void> {
        await this.getAgent();
    }

    /** Return the shared native Agent, initializing it once on first use. */
    async getAgent(): Promise<AiAgent> {
        this.assertRunning();

        if (this.agent) {
            return this.agent;
        }
        if (this.initialization) {
            return this.initialization;
        }

        const initialization = this.initializeAgent();
        this.initialization = initialization;
        void initialization.catch(() => {
            if (this.initialization === initialization) {
                this.initialization = undefined;
            }
        });
        return initialization;
    }

    /** Create a long-lived, workspace-bound session without blocking the event loop. */
    async sessionAsync(workspace: string, options?: AiSessionOptions): Promise<AiSession> {
        const resolvedWorkspace = this.requiredString('workspace', workspace);
        const resolvedOptions = this.sessionOptions(options);
        return this.acquireSession(agent => agent.sessionAsync(resolvedWorkspace, resolvedOptions));
    }

    /** Resume a saved session. The supplied options must configure its session store. */
    async resumeSessionAsync(sessionId: string, options: AiSessionOptions): Promise<AiSession> {
        const resolvedSessionId = this.requiredString('sessionId', sessionId);
        const resolvedOptions = this.sessionOptions(options, true) as AiSessionOptions;
        return this.acquireSession(agent => agent.resumeSessionAsync(resolvedSessionId, resolvedOptions));
    }

    /** Atomically replace an idle persisted session while retaining its session ID. */
    async replaceSessionAsync(current: AiSession, options: AiSessionOptions): Promise<AiSession> {
        this.assertSession(current, 'current session');
        const resolvedOptions = this.sessionOptions(options, true) as AiSessionOptions;
        return this.acquireSession(agent => agent.replaceSessionAsync(current, resolvedOptions));
    }

    /** Short alias for `replaceSessionAsync`. */
    async replace(current: AiSession, options: AiSessionOptions): Promise<AiSession> {
        return this.replaceSessionAsync(current, options);
    }

    /** Create a session from a named A3S Code agent definition. */
    async sessionForAgentAsync(
        workspace: string,
        agentName: string,
        agentDirs?: string[] | null,
        options?: AiSessionOptions,
    ): Promise<AiSession> {
        const resolvedWorkspace = this.requiredString('workspace', workspace);
        const resolvedAgentName = this.requiredString('agentName', agentName);
        const resolvedAgentDirs = this.agentDirectories(agentDirs);
        const resolvedOptions = this.sessionOptions(options);
        return this.acquireSession(agent =>
            agent.sessionForAgentAsync(resolvedWorkspace, resolvedAgentName, resolvedAgentDirs, resolvedOptions),
        );
    }

    /** Create a session from an in-memory disposable worker definition. */
    async sessionForWorkerAsync(
        workspace: string,
        worker: AiWorkerAgentSpec,
        options?: AiSessionOptions,
    ): Promise<AiSession> {
        const resolvedWorkspace = this.requiredString('workspace', workspace);
        if (!this.isObject(worker)) {
            throw new AiConfigurationError('worker must be an object');
        }
        const resolvedOptions = this.sessionOptions(options);
        return this.acquireSession(agent =>
            agent.sessionForWorkerAsync(resolvedWorkspace, worker, resolvedOptions),
        );
    }

    /** List stable IDs for live sessions owned by the shared Agent. */
    async listSessions(): Promise<string[]> {
        const agent = await this.activeAgent();
        const sessionIds = await agent.listSessions();
        if (!Array.isArray(sessionIds) || sessionIds.some(value => typeof value !== 'string')) {
            throw new AiSdkContractError('A3S Code Agent.listSessions returned an invalid session ID list');
        }
        return sessionIds;
    }

    /** Close one Agent-owned session by ID without retaining its native object. */
    async closeSession(sessionId: string): Promise<boolean> {
        const resolvedSessionId = this.requiredString('sessionId', sessionId);
        const agent = await this.activeAgent();
        const closed = await agent.closeSession(resolvedSessionId);
        if (typeof closed !== 'boolean') {
            throw new AiSdkContractError('A3S Code Agent.closeSession returned a non-boolean result');
        }
        return closed;
    }

    /** Run arbitrary work in a disposable session and always close that session. */
    async withSession<TResult>(
        workspace: string,
        callback: AiSessionCallback<TResult>,
        options?: AiSessionOptions,
    ): Promise<TResult> {
        if (typeof callback !== 'function') {
            throw new AiConfigurationError('AiService.withSession requires a callback');
        }
        const session = await this.sessionAsync(workspace, options);
        let operationError: unknown | typeof NO_ERROR = NO_ERROR;
        try {
            return await callback(session);
        } catch (error) {
            operationError = error;
            throw error;
        } finally {
            await this.closeDisposableSession(session, operationError);
        }
    }

    run(options: AiInvocationOptions): Promise<AiRunResult>;
    run(workspace: string, request: AiSessionRequest, sessionOptions?: AiSessionOptions): Promise<AiRunResult>;
    async run(
        workspaceOrOptions: string | AiInvocationOptions,
        request?: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): Promise<AiRunResult> {
        const invocation = this.normalizeInvocation(workspaceOrOptions, request, sessionOptions);
        this.throwIfAborted(invocation.signal);
        return this.withSession(
            invocation.workspace,
            session => this.awaitWithSignal(session, invocation.signal, () => session.send(invocation.request)),
            invocation.sessionOptions,
        );
    }

    stream(options: AiInvocationOptions): AsyncGenerator<AiAgentEvent, void, void>;
    stream(
        workspace: string,
        request: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): AsyncGenerator<AiAgentEvent, void, void>;
    async *stream(
        workspaceOrOptions: string | AiInvocationOptions,
        request?: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): AsyncGenerator<AiAgentEvent, void, void> {
        const invocation = this.normalizeInvocation(workspaceOrOptions, request, sessionOptions);
        this.throwIfAborted(invocation.signal);
        const session = await this.sessionAsync(invocation.workspace, invocation.sessionOptions);
        let operationError: unknown | typeof NO_ERROR = NO_ERROR;
        try {
            const events = await this.awaitWithSignal(session, invocation.signal, () =>
                session.stream(invocation.request),
            );
            if (!events || typeof events[Symbol.asyncIterator] !== 'function') {
                throw new AiSdkContractError('A3S Code Session.stream returned a non-async-iterable value');
            }

            const iterator = events[Symbol.asyncIterator]();
            let iterationError: unknown | typeof NO_ERROR = NO_ERROR;
            try {
                while (true) {
                    const next = await this.awaitWithSignal(session, invocation.signal, () => iterator.next());
                    if (next.done) {
                        break;
                    }
                    yield next.value;
                }
            } catch (error) {
                iterationError = error;
                throw error;
            } finally {
                if (typeof iterator.return === 'function') {
                    try {
                        await iterator.return();
                    } catch (cleanupError) {
                        if (iterationError !== NO_ERROR) {
                            throw new AiResourceCleanupError(
                                iterationError,
                                cleanupError,
                                'AI stream iteration and iterator cleanup both failed',
                            );
                        }
                        throw cleanupError;
                    }
                }
            }
        } catch (error) {
            operationError = error;
            throw error;
        } finally {
            await this.closeDisposableSession(session, operationError);
        }
    }

    /**
     * Cancel a specific run when an ID is available. An explicit stale ID never
     * falls back to broad cancellation, so it cannot cancel a newer run.
     */
    async cancelRun(session: AiSession, runId?: string): Promise<boolean> {
        this.assertSession(session, 'session');
        if (runId !== undefined) {
            return session.cancelRun(this.requiredString('runId', runId));
        }

        const currentRun = (await session.currentRun()) as unknown;
        const currentRunId = this.readRunId(currentRun);
        if (currentRunId) {
            return session.cancelRun(currentRunId);
        }
        return false;
    }

    /** Close the shared Agent and every live session it owns. Safe to call repeatedly. */
    shutdown(): Promise<void> {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        this.shuttingDown = true;
        this.shutdownPromise = this.performShutdown(this.agent, this.initialization);
        return this.shutdownPromise;
    }

    private async performShutdown(agent?: AiAgent, initialization?: Promise<AiAgent>): Promise<void> {
        let agentToClose = agent;
        if (!agentToClose && initialization) {
            try {
                agentToClose = await initialization;
            } catch {
                // Initialization may reject with AiServiceClosedError after it has
                // installed the Agent for this shutdown operation to close.
                agentToClose = this.agent;
            }
        }

        await Promise.allSettled([...this.sessionAcquisitions]);
        agentToClose ??= this.agent;
        try {
            await agentToClose?.close();
        } finally {
            this.agent = undefined;
            this.initialization = undefined;
        }
    }

    private async initializeAgent(): Promise<AiAgent> {
        const runtime = await (this.options.runtimeLoader ?? defaultRuntimeLoader)();
        if (!runtime?.Agent || typeof runtime.Agent.create !== 'function') {
            throw new AiSdkContractError('The A3S Code runtime loader did not provide Agent.create');
        }

        const agent = await runtime.Agent.create(this.options.configSource);
        try {
            this.assertAgent(agent);
        } catch (contractError) {
            if (this.isObject(agent) && typeof agent.close === 'function') {
                try {
                    await agent.close();
                } catch (cleanupError) {
                    throw new AiResourceCleanupError(
                        contractError,
                        cleanupError,
                        'A3S Code Agent validation and cleanup both failed',
                    );
                }
            }
            throw contractError;
        }

        this.agent = agent;
        if (this.shuttingDown) {
            throw new AiServiceClosedError();
        }
        return agent;
    }

    private async activeAgent(): Promise<AiAgent> {
        const agent = await this.getAgent();
        this.assertRunning();
        return agent;
    }

    private async acquireSession(factory: (agent: AiAgent) => Promise<AiSession>): Promise<AiSession> {
        const agent = await this.activeAgent();
        const acquisition = (async () => {
            const session = await factory(agent);
            this.assertSession(session, 'created session');
            if (!this.shuttingDown) {
                return session;
            }

            const closedError = new AiServiceClosedError();
            try {
                await session.closeAsync();
            } catch (cleanupError) {
                throw new AiResourceCleanupError(
                    closedError,
                    cleanupError,
                    'AI session creation completed during shutdown and cleanup failed',
                );
            }
            throw closedError;
        })();
        return this.trackSessionAcquisition(acquisition);
    }

    private trackSessionAcquisition<TResult>(operation: Promise<TResult>): Promise<TResult> {
        this.sessionAcquisitions.add(operation);
        void operation.then(
            () => this.sessionAcquisitions.delete(operation),
            () => this.sessionAcquisitions.delete(operation),
        );
        return operation;
    }

    private async closeDisposableSession(
        session: AiSession,
        operationError: unknown | typeof NO_ERROR,
    ): Promise<void> {
        try {
            await session.closeAsync();
        } catch (cleanupError) {
            if (operationError !== NO_ERROR) {
                throw new AiResourceCleanupError(operationError, cleanupError);
            }
            throw cleanupError;
        }
    }

    private awaitWithSignal<TResult>(
        session: AiSession,
        signal: AbortSignal | undefined,
        operation: () => Promise<TResult>,
    ): Promise<TResult> {
        if (!signal) {
            return Promise.resolve().then(operation);
        }
        if (signal.aborted) {
            this.cancelDisposableSession(session);
            return Promise.reject(new AiOperationAbortedError(signal.reason));
        }

        return new Promise<TResult>((resolve, reject) => {
            let settled = false;
            const removeAbortListener = () => signal.removeEventListener('abort', abort);
            const abort = () => {
                if (settled) {
                    return;
                }
                settled = true;
                removeAbortListener();
                this.cancelDisposableSession(session);
                reject(new AiOperationAbortedError(signal.reason));
            };

            signal.addEventListener('abort', abort, { once: true });
            if (signal.aborted) {
                abort();
                return;
            }

            void Promise.resolve()
                .then(operation)
                .then(
                    result => {
                        if (!settled) {
                            settled = true;
                            removeAbortListener();
                            resolve(result);
                        }
                    },
                    error => {
                        if (!settled) {
                            settled = true;
                            removeAbortListener();
                            reject(error);
                        }
                    },
                );
        });
    }

    private cancelDisposableSession(session: AiSession): void {
        void Promise.resolve()
            .then(() => session.cancelAsync())
            .catch(() => undefined);
    }

    private normalizeInvocation(
        workspaceOrOptions: string | AiInvocationOptions,
        request?: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): NormalizedInvocation {
        const invocation: AiInvocationOptions =
            typeof workspaceOrOptions === 'string'
                ? {
                      workspace: workspaceOrOptions,
                      request: request as AiSessionRequest,
                      sessionOptions,
                  }
                : workspaceOrOptions;

        if (!this.isObject(invocation)) {
            throw new AiConfigurationError('AiService.run/stream options must be an object');
        }
        if (invocation.request === undefined) {
            throw new AiConfigurationError('AiService.run/stream requires a request');
        }

        return {
            workspace: this.requiredString('workspace', invocation.workspace),
            request: this.request(invocation.request),
            sessionOptions: this.sessionOptions(invocation.sessionOptions),
            signal: this.abortSignal(invocation.signal),
        };
    }

    private request(request: AiSessionRequest): AiSessionRequest {
        if (typeof request === 'string') {
            this.requiredString('request', request);
            return request;
        }
        if (!this.isObject(request)) {
            throw new AiConfigurationError('request must be a non-empty string or an object with a prompt');
        }
        this.requiredString('request.prompt', request.prompt);
        return request;
    }

    private sessionOptions(options: AiSessionOptions | undefined, required = false): AiSessionOptions | undefined {
        if (options === undefined && !required) {
            return undefined;
        }
        if (!this.isObject(options)) {
            throw new AiConfigurationError('sessionOptions must be an object');
        }
        return options;
    }

    private agentDirectories(agentDirs: string[] | null | undefined): string[] | null | undefined {
        if (agentDirs === undefined || agentDirs === null) {
            return agentDirs;
        }
        if (!Array.isArray(agentDirs)) {
            throw new AiConfigurationError('agentDirs must be an array of non-empty strings');
        }
        for (const directory of agentDirs) {
            this.requiredString('agentDirs entry', directory);
        }
        return [...agentDirs];
    }

    private abortSignal(signal: AbortSignal | undefined): AbortSignal | undefined {
        if (
            signal !== undefined &&
            (!this.isObject(signal) ||
                typeof signal.aborted !== 'boolean' ||
                typeof signal.addEventListener !== 'function' ||
                typeof signal.removeEventListener !== 'function')
        ) {
            throw new AiConfigurationError('signal must implement the AbortSignal contract');
        }
        return signal;
    }

    private throwIfAborted(signal?: AbortSignal): void {
        if (signal?.aborted) {
            throw new AiOperationAbortedError(signal.reason);
        }
    }

    private requiredString(name: string, value: unknown): string {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new AiConfigurationError(`${name} must be a non-empty string`);
        }
        if (value.includes('\0')) {
            throw new AiConfigurationError(`${name} cannot contain a null byte`);
        }
        return value;
    }

    private readRunId(run: unknown): string | undefined {
        if (!this.isObject(run) || !('id' in run)) {
            return undefined;
        }
        const id = run.id;
        return typeof id === 'string' && id.trim().length > 0 ? id : undefined;
    }

    private assertAgent(agent: unknown): asserts agent is AiAgent {
        if (!this.isObject(agent)) {
            throw new AiSdkContractError('A3S Code Agent.create returned an invalid Agent');
        }
        for (const method of REQUIRED_AGENT_METHODS) {
            if (typeof agent[method] !== 'function') {
                throw new AiSdkContractError(`A3S Code Agent is missing ${method}()`);
            }
        }
    }

    private assertSession(session: unknown, label: string): asserts session is AiSession {
        if (!this.isObject(session)) {
            throw new AiSdkContractError(`A3S Code ${label} is invalid`);
        }
        for (const method of REQUIRED_SESSION_METHODS) {
            if (typeof session[method] !== 'function') {
                throw new AiSdkContractError(`A3S Code ${label} is missing ${method}()`);
            }
        }
    }

    private assertRunning(): void {
        if (this.shuttingDown) {
            throw new AiServiceClosedError();
        }
    }

    private isObject(value: unknown): value is Record<PropertyKey, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
