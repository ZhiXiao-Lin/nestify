import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
    AI_MODULE_OPTIONS,
    type AiAgent,
    type AiAgentEvent,
    type AiInvocationOptions,
    type AiModuleOptions,
    type AiRunResult,
    type AiRuntime,
    type AiSession,
    type AiSessionOptions,
    type AiSessionRequest,
} from './ai.types';

const defaultRuntimeLoader = async (): Promise<AiRuntime> => import('@a3s-lab/code');

@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
    private agent?: AiAgent;
    private initialization?: Promise<AiAgent>;
    private shutdownPromise?: Promise<void>;
    private shuttingDown = false;

    constructor(@Inject(AI_MODULE_OPTIONS) private readonly options: AiModuleOptions) {}

    async onModuleInit(): Promise<void> {
        if (this.options.eager === true) {
            await this.ready();
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.shutdown();
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
        const agent = await this.getAgent();
        return agent.sessionAsync(workspace, options);
    }

    /** Resume a saved session. The supplied options must configure its session store. */
    async resumeSessionAsync(sessionId: string, options: AiSessionOptions): Promise<AiSession> {
        const agent = await this.getAgent();
        return agent.resumeSessionAsync(sessionId, options);
    }

    /** Atomically replace an idle persisted session while retaining its session ID. */
    async replaceSessionAsync(current: AiSession, options: AiSessionOptions): Promise<AiSession> {
        const agent = await this.getAgent();
        return agent.replaceSessionAsync(current, options);
    }

    /** Short alias for `replaceSessionAsync`. */
    async replace(current: AiSession, options: AiSessionOptions): Promise<AiSession> {
        return this.replaceSessionAsync(current, options);
    }

    run(options: AiInvocationOptions): Promise<AiRunResult>;
    run(workspace: string, request: AiSessionRequest, sessionOptions?: AiSessionOptions): Promise<AiRunResult>;
    async run(
        workspaceOrOptions: string | AiInvocationOptions,
        request?: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): Promise<AiRunResult> {
        const invocation = this.normalizeInvocation(workspaceOrOptions, request, sessionOptions);
        const session = await this.sessionAsync(invocation.workspace, invocation.sessionOptions);
        let operationFailed = false;
        try {
            return await session.send(invocation.request);
        } catch (error) {
            operationFailed = true;
            throw error;
        } finally {
            await this.closeDisposableSession(session, operationFailed);
        }
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
        const session = await this.sessionAsync(invocation.workspace, invocation.sessionOptions);
        let operationFailed = false;
        try {
            const events = await session.stream(invocation.request);
            for await (const event of events) {
                yield event;
            }
        } catch (error) {
            operationFailed = true;
            throw error;
        } finally {
            await this.closeDisposableSession(session, operationFailed);
        }
    }

    /**
     * Cancel a specific run when an ID is available. An explicit stale ID never
     * falls back to broad cancellation, so it cannot cancel a newer run.
     */
    async cancelRun(session: AiSession, runId?: string): Promise<boolean> {
        if (runId !== undefined) {
            return session.cancelRun(runId);
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
        const agent = this.agent;
        const initialization = this.initialization;
        this.shutdownPromise = (async () => {
            let agentToClose = agent;
            if (!agentToClose && initialization) {
                try {
                    agentToClose = await initialization;
                } catch {
                    // A service-closure rejection may still leave an initialized
                    // agent for this shutdown operation to close.
                    agentToClose = this.agent;
                }
            }
            try {
                await agentToClose?.close();
            } finally {
                this.agent = undefined;
                this.initialization = undefined;
            }
        })();
        return this.shutdownPromise;
    }

    private async initializeAgent(): Promise<AiAgent> {
        const configSource = this.options.configSource;
        if (typeof configSource !== 'string' || configSource.trim().length === 0) {
            throw new TypeError('AiModule requires a non-empty configSource');
        }

        const runtime = await (this.options.runtimeLoader ?? defaultRuntimeLoader)();
        if (!runtime?.Agent || typeof runtime.Agent.create !== 'function') {
            throw new TypeError('The A3S Code runtime loader did not provide Agent.create');
        }

        const agent = await runtime.Agent.create(configSource);
        this.agent = agent;
        if (this.shuttingDown) {
            throw this.closedError();
        }
        return agent;
    }

    private async closeDisposableSession(session: AiSession, operationFailed: boolean): Promise<void> {
        try {
            await session.closeAsync();
        } catch (error) {
            if (!operationFailed) {
                throw error;
            }
        }
    }

    private normalizeInvocation(
        workspaceOrOptions: string | AiInvocationOptions,
        request?: AiSessionRequest,
        sessionOptions?: AiSessionOptions,
    ): AiInvocationOptions {
        if (typeof workspaceOrOptions !== 'string') {
            return workspaceOrOptions;
        }
        if (request === undefined) {
            throw new TypeError('AiService.run/stream requires a request');
        }
        return {
            workspace: workspaceOrOptions,
            request,
            sessionOptions,
        };
    }

    private readRunId(run: unknown): string | undefined {
        if (typeof run !== 'object' || run === null || !('id' in run)) {
            return undefined;
        }
        const id = (run as { id?: unknown }).id;
        return typeof id === 'string' && id.length > 0 ? id : undefined;
    }

    private assertRunning(): void {
        if (this.shuttingDown) {
            throw this.closedError();
        }
    }

    private closedError(): Error {
        return new Error('AiService has been shut down');
    }
}
