import {
    AiConfigurationError,
    AiOperationAbortedError,
    AiResourceCleanupError,
    AiSdkContractError,
    AiServiceClosedError,
} from '../ai.errors';
import { AiService } from '../ai.service';
import type { AiAgent, AiAgentEvent, AiRuntime, AiSession, AiSessionRequest, AiWorkerAgentSpec } from '../ai.types';

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (predicate()) {
            return;
        }
        await Promise.resolve();
    }
    throw new Error('condition was not reached');
}

function asyncEvents(events: AiAgentEvent[]): AsyncIterable<AiAgentEvent> {
    return {
        async *[Symbol.asyncIterator]() {
            for (const event of events) {
                yield event;
            }
        },
    };
}

function event(type: string, payload: unknown): AiAgentEvent {
    return {
        version: 1,
        type,
        payload,
        payloadJson: JSON.stringify(payload),
    } as AiAgentEvent;
}

function createSession(overrides: Partial<Record<keyof AiSession, unknown>> = {}): AiSession {
    return {
        send: jest.fn(async () => ({ text: 'done' })),
        stream: jest.fn(async () => asyncEvents([])),
        closeAsync: jest.fn(async () => undefined),
        cancelRun: jest.fn(async () => true),
        cancelAsync: jest.fn(async () => true),
        currentRun: jest.fn(async () => null),
        ...overrides,
    } as unknown as AiSession;
}

function createFixture(options: { createAgent?: () => Promise<AiAgent> } = {}) {
    const session = createSession();
    const replacement = createSession();
    const agent = {
        sessionAsync: jest.fn(async () => session),
        resumeSessionAsync: jest.fn(async () => session),
        replaceSessionAsync: jest.fn(async () => replacement),
        sessionForAgentAsync: jest.fn(async () => session),
        sessionForWorkerAsync: jest.fn(async () => session),
        listSessions: jest.fn(async () => ['session-1']),
        closeSession: jest.fn(async () => true),
        close: jest.fn(async () => undefined),
    } as unknown as AiAgent;
    const create = jest.fn(options.createAgent ?? (async () => agent));
    const runtime: AiRuntime = { Agent: { create } };
    const runtimeLoader = jest.fn(async () => runtime);
    const service = new AiService({ configSource: 'agent.acl', runtimeLoader });
    return { agent, create, replacement, runtimeLoader, service, session };
}

describe('AiService initialization', () => {
    it('is lazy, observable, and coalesces concurrent initialization calls', async () => {
        const fixture = createFixture();

        expect(fixture.service.isReady).toBe(false);
        expect(fixture.service.isShuttingDown).toBe(false);
        await fixture.service.onModuleInit();
        expect(fixture.runtimeLoader).not.toHaveBeenCalled();

        const [first, second, readyResult] = await Promise.all([
            fixture.service.getAgent(),
            fixture.service.getAgent(),
            fixture.service.ready(),
        ]);

        expect(first).toBe(fixture.agent);
        expect(second).toBe(fixture.agent);
        expect(readyResult).toBeUndefined();
        expect(fixture.service.isReady).toBe(true);
        expect(fixture.runtimeLoader).toHaveBeenCalledTimes(1);
        expect(fixture.create).toHaveBeenCalledTimes(1);
        expect(fixture.create).toHaveBeenCalledWith('agent.acl');
    });

    it('initializes eagerly when configured and remains idempotent', async () => {
        const fixture = createFixture();
        const service = new AiService({
            configSource: 'agent.acl',
            eager: true,
            runtimeLoader: fixture.runtimeLoader,
        });

        await service.onModuleInit();
        await service.ready();

        expect(fixture.runtimeLoader).toHaveBeenCalledTimes(1);
        expect(fixture.create).toHaveBeenCalledTimes(1);
    });

    it('allows a later call to retry after initialization fails', async () => {
        const fixture = createFixture();
        fixture.create.mockRejectedValueOnce(new Error('native initialization failed'));

        await expect(fixture.service.getAgent()).rejects.toThrow('native initialization failed');
        await expect(fixture.service.getAgent()).resolves.toBe(fixture.agent);

        expect(fixture.runtimeLoader).toHaveBeenCalledTimes(2);
        expect(fixture.create).toHaveBeenCalledTimes(2);
    });

    it('validates configuration before loading the native runtime', () => {
        const runtimeLoader = jest.fn();

        expect(() => new AiService({ configSource: '   ', runtimeLoader })).toThrow(AiConfigurationError);
        expect(() => new AiService({ configSource: 'agent\0.acl', runtimeLoader })).toThrow('null byte');
        expect(() => new AiService({ configSource: 'agent.acl', eager: 'yes' as never })).toThrow('must be a boolean');
        expect(runtimeLoader).not.toHaveBeenCalled();
    });

    it('rejects malformed runtime and Agent contracts and closes a malformed Agent', async () => {
        const invalidRuntime = new AiService({
            configSource: 'agent.acl',
            runtimeLoader: async () => ({}) as AiRuntime,
        });
        await expect(invalidRuntime.ready()).rejects.toThrow('did not provide Agent.create');

        const close = jest.fn(async () => undefined);
        const invalidAgent = new AiService({
            configSource: 'agent.acl',
            runtimeLoader: async () => ({ Agent: { create: async () => ({ close }) as unknown as AiAgent } }),
        });
        await expect(invalidAgent.ready()).rejects.toBeInstanceOf(AiSdkContractError);
        expect(close).toHaveBeenCalledTimes(1);

        const cleanupError = new Error('malformed agent close failed');
        const failingClose = jest.fn(async () => Promise.reject(cleanupError));
        const uncleanAgent = new AiService({
            configSource: 'agent.acl',
            runtimeLoader: async () => ({
                Agent: { create: async () => ({ close: failingClose }) as unknown as AiAgent },
            }),
        });
        await expect(uncleanAgent.ready()).rejects.toMatchObject({ cleanupError });
    });
});

describe('AiService sessions', () => {
    it('delegates native async session and control-plane APIs without adding a queue', async () => {
        const fixture = createFixture();
        const sessionOptions = { model: 'test/model' };
        const worker: AiWorkerAgentSpec = { name: 'reviewer', description: 'Review changes' };
        const agentDirs = ['/agents'];

        await expect(fixture.service.sessionAsync('/workspace', sessionOptions)).resolves.toBe(fixture.session);
        await expect(fixture.service.resumeSessionAsync('session-1', sessionOptions)).resolves.toBe(fixture.session);
        await expect(fixture.service.replaceSessionAsync(fixture.session, sessionOptions)).resolves.toBe(
            fixture.replacement,
        );
        await expect(fixture.service.replace(fixture.session, sessionOptions)).resolves.toBe(fixture.replacement);
        await expect(
            fixture.service.sessionForAgentAsync('/workspace', 'explore', agentDirs, sessionOptions),
        ).resolves.toBe(fixture.session);
        await expect(fixture.service.sessionForWorkerAsync('/workspace', worker, sessionOptions)).resolves.toBe(
            fixture.session,
        );
        await expect(fixture.service.listSessions()).resolves.toEqual(['session-1']);
        await expect(fixture.service.closeSession('session-1')).resolves.toBe(true);

        expect(fixture.agent.sessionAsync).toHaveBeenCalledWith('/workspace', sessionOptions);
        expect(fixture.agent.resumeSessionAsync).toHaveBeenCalledWith('session-1', sessionOptions);
        expect(fixture.agent.replaceSessionAsync).toHaveBeenNthCalledWith(1, fixture.session, sessionOptions);
        expect(fixture.agent.replaceSessionAsync).toHaveBeenNthCalledWith(2, fixture.session, sessionOptions);
        expect(fixture.agent.sessionForAgentAsync).toHaveBeenCalledWith(
            '/workspace',
            'explore',
            ['/agents'],
            sessionOptions,
        );
        expect(fixture.agent.sessionForWorkerAsync).toHaveBeenCalledWith('/workspace', worker, sessionOptions);
    });

    it('fails fast on invalid session inputs without initializing the runtime', async () => {
        const fixture = createFixture();

        await expect(fixture.service.sessionAsync(' ')).rejects.toBeInstanceOf(AiConfigurationError);
        await expect(fixture.service.resumeSessionAsync('', {})).rejects.toThrow('sessionId');
        await expect(fixture.service.replaceSessionAsync({} as AiSession, {})).rejects.toBeInstanceOf(
            AiSdkContractError,
        );
        await expect(fixture.service.sessionForAgentAsync('/workspace', '', [])).rejects.toThrow('agentName');
        await expect(fixture.service.sessionForAgentAsync('/workspace', 'explore', 'agents' as never)).rejects.toThrow(
            'agentDirs',
        );
        await expect(fixture.service.sessionForAgentAsync('/workspace', 'explore', [' '])).rejects.toThrow(
            'agentDirs entry',
        );
        await expect(fixture.service.sessionForWorkerAsync('/workspace', null as never)).rejects.toThrow('worker');
        await expect(fixture.service.closeSession('\0')).rejects.toThrow('null byte');
        await expect(fixture.service.cancelRun(fixture.session, ' ')).rejects.toThrow('runId');
        await expect(fixture.service.withSession('/workspace', null as never)).rejects.toThrow('requires a callback');
        await expect(fixture.service.run(null as never)).rejects.toThrow('options must be an object');
        await expect(fixture.service.run('/workspace', null as never)).rejects.toThrow('request must be');
        await expect(fixture.service.run('/workspace', 'work', null as never)).rejects.toThrow('sessionOptions');
        await expect(
            fixture.service.run({ workspace: '/workspace', request: 'work', signal: {} as AbortSignal }),
        ).rejects.toThrow('AbortSignal');
        expect(fixture.runtimeLoader).not.toHaveBeenCalled();
    });

    it('validates control-plane results returned by custom runtimes', async () => {
        const fixture = createFixture();
        (fixture.agent.listSessions as jest.Mock).mockResolvedValue([42]);
        (fixture.agent.closeSession as jest.Mock).mockResolvedValue('yes');

        await expect(fixture.service.listSessions()).rejects.toThrow('invalid session ID list');
        await expect(fixture.service.closeSession('session-1')).rejects.toThrow('non-boolean');
    });

    it('closes a malformed session result before rejecting its SDK contract', async () => {
        const fixture = createFixture();
        const closeAsync = jest.fn(async () => undefined);
        (fixture.agent.sessionAsync as jest.Mock).mockResolvedValue({ closeAsync });

        await expect(fixture.service.sessionAsync('/workspace')).rejects.toBeInstanceOf(AiSdkContractError);
        expect(closeAsync).toHaveBeenCalledTimes(1);
    });

    it('runs arbitrary callbacks in a disposable session and always closes it', async () => {
        const fixture = createFixture();
        const result = await fixture.service.withSession('/workspace', async session => {
            expect(session).toBe(fixture.session);
            return 'complete';
        });

        expect(result).toBe('complete');
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('preserves callback and cleanup failures together', async () => {
        const fixture = createFixture();
        const operationError = new Error('callback failed');
        const cleanupError = new Error('close failed');
        (fixture.session.closeAsync as jest.Mock).mockRejectedValue(cleanupError);

        let received: unknown;
        try {
            await fixture.service.withSession('/workspace', () => Promise.reject(operationError));
        } catch (error) {
            received = error;
        }

        expect(received).toBeInstanceOf(AiResourceCleanupError);
        expect(received).toMatchObject({ operationError, cleanupError });
    });

    it('propagates cleanup failure after a successful callback', async () => {
        const fixture = createFixture();
        const cleanupError = new Error('close failed');
        (fixture.session.closeAsync as jest.Mock).mockRejectedValue(cleanupError);

        await expect(fixture.service.withSession('/workspace', () => 'complete')).rejects.toBe(cleanupError);
    });

    it('runs a disposable session and always closes it', async () => {
        const fixture = createFixture();
        const request: AiSessionRequest = { prompt: 'Explain auth' };

        await expect(
            fixture.service.run({ workspace: '/workspace', request, sessionOptions: { model: 'test/model' } }),
        ).resolves.toEqual({ text: 'done' });

        expect(fixture.session.send).toHaveBeenCalledWith(request);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('preserves run and close failures instead of suppressing cleanup failure', async () => {
        const runError = Object.assign(new Error('run failed'), { code: 'SESSION_BUSY' });
        const closeError = new Error('close failed');
        const session = createSession({
            send: jest.fn(async () => Promise.reject(runError)),
            closeAsync: jest.fn(async () => Promise.reject(closeError)),
        });
        const fixture = createFixture();
        (fixture.agent.sessionAsync as jest.Mock).mockResolvedValue(session);

        await expect(fixture.service.run('/workspace', 'fail')).rejects.toMatchObject({
            operationError: runError,
            cleanupError: closeError,
        });
        expect(session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('validates one-shot requests before creating a session', async () => {
        const fixture = createFixture();

        await expect(fixture.service.run('/workspace', undefined as never)).rejects.toThrow('requires a request');
        await expect(fixture.service.run('/workspace', ' ')).rejects.toThrow('request');
        await expect(fixture.service.run({ workspace: '/workspace', request: { prompt: '' } })).rejects.toThrow(
            'request.prompt',
        );
        expect(fixture.agent.sessionAsync).not.toHaveBeenCalled();
    });

    it('supports AbortSignal cancellation for a disposable run', async () => {
        const fixture = createFixture();
        const send = deferred<never>();
        (fixture.session.send as jest.Mock).mockReturnValue(send.promise);
        const controller = new AbortController();
        const reason = new Error('request disconnected');

        const running = fixture.service.run({ workspace: '/workspace', request: 'work', signal: controller.signal });
        await waitUntil(() => (fixture.session.send as jest.Mock).mock.calls.length === 1);
        controller.abort(reason);

        await expect(running).rejects.toMatchObject({
            name: 'AiOperationAbortedError',
            code: 'AI_OPERATION_ABORTED',
            reason,
        });
        await waitUntil(() => (fixture.session.cancelAsync as jest.Mock).mock.calls.length === 1);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('rejects a pre-aborted invocation before initializing', async () => {
        const fixture = createFixture();
        const controller = new AbortController();
        controller.abort('cancelled');

        await expect(
            fixture.service.run({ workspace: '/workspace', request: 'work', signal: controller.signal }),
        ).rejects.toBeInstanceOf(AiOperationAbortedError);
        expect(fixture.runtimeLoader).not.toHaveBeenCalled();
    });
});

describe('AiService streaming', () => {
    it('passes every native event through unchanged and closes in finally', async () => {
        const fixture = createFixture();
        const events = [event('text_delta', { text: 'hello' }), event('agent_end', { text: 'hello' })];
        (fixture.session.stream as jest.Mock).mockResolvedValue(asyncEvents(events));

        const received: AiAgentEvent[] = [];
        for await (const item of fixture.service.stream('/workspace', { prompt: 'Say hello' })) {
            received.push(item);
        }

        expect(received).toEqual(events);
        expect(received[0]).toBe(events[0]);
        expect(received[1]).toBe(events[1]);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('closes the disposable session when a consumer stops early', async () => {
        const fixture = createFixture();
        const events = [event('text_delta', { text: 'one' }), event('text_delta', { text: 'two' })];
        (fixture.session.stream as jest.Mock).mockResolvedValue(asyncEvents(events));

        for await (const _item of fixture.service.stream({ workspace: '/workspace', request: 'count' })) {
            break;
        }

        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('preserves stream creation and session cleanup failures together', async () => {
        const fixture = createFixture();
        const streamError = Object.assign(new Error('stream failed'), { code: 'SESSION_BUSY' });
        const closeError = new Error('close failed');
        (fixture.session.stream as jest.Mock).mockRejectedValue(streamError);
        (fixture.session.closeAsync as jest.Mock).mockRejectedValue(closeError);

        const consume = async () => {
            for await (const _item of fixture.service.stream('/workspace', 'fail')) {
                // The stream rejects before yielding.
            }
        };

        await expect(consume()).rejects.toMatchObject({ operationError: streamError, cleanupError: closeError });
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('cancels an in-flight iterator through AbortSignal and closes the session', async () => {
        const fixture = createFixture();
        const pendingEvent = deferred<IteratorResult<AiAgentEvent>>();
        const iterator = {
            next: jest.fn(() => pendingEvent.promise),
            return: jest.fn(async () => ({ done: true, value: undefined })),
        };
        (fixture.session.stream as jest.Mock).mockResolvedValue({
            [Symbol.asyncIterator]: () => iterator,
        });
        const controller = new AbortController();
        const stream = fixture.service.stream({ workspace: '/workspace', request: 'work', signal: controller.signal });
        const next = stream.next();
        await waitUntil(() => iterator.next.mock.calls.length === 1);

        controller.abort();

        await expect(next).rejects.toBeInstanceOf(AiOperationAbortedError);
        expect(iterator.return).toHaveBeenCalledTimes(1);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('rejects a malformed native stream value and still closes the session', async () => {
        const fixture = createFixture();
        (fixture.session.stream as jest.Mock).mockResolvedValue({});

        const consume = async () => {
            for await (const _item of fixture.service.stream('/workspace', 'work')) {
                // No values are expected.
            }
        };

        await expect(consume()).rejects.toBeInstanceOf(AiSdkContractError);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('preserves iterator operation and iterator cleanup failures together', async () => {
        const fixture = createFixture();
        const iterationError = new Error('iterator failed');
        const cleanupError = new Error('iterator return failed');
        const iterator = {
            next: jest.fn(async () => Promise.reject(iterationError)),
            return: jest.fn(async () => Promise.reject(cleanupError)),
        };
        (fixture.session.stream as jest.Mock).mockResolvedValue({
            [Symbol.asyncIterator]: () => iterator,
        });

        const consume = async () => {
            for await (const _item of fixture.service.stream('/workspace', 'work')) {
                // The iterator rejects before yielding.
            }
        };

        await expect(consume()).rejects.toMatchObject({ operationError: iterationError, cleanupError });
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('supports native async iterators without an optional return method', async () => {
        const fixture = createFixture();
        const iterator = {
            next: jest.fn(async () => ({ done: true, value: undefined })),
            [Symbol.asyncIterator]() {
                return this;
            },
        };
        (fixture.session.stream as jest.Mock).mockResolvedValue(iterator);

        for await (const _item of fixture.service.stream('/workspace', 'work')) {
            // No values are expected.
        }

        expect(iterator.next).toHaveBeenCalledTimes(1);
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
    });
});

describe('AiService cancellation and shutdown', () => {
    it('uses an explicit run ID and never broad-cancels after a stale ID', async () => {
        const fixture = createFixture();
        (fixture.session.cancelRun as jest.Mock).mockResolvedValue(false);

        await expect(fixture.service.cancelRun(fixture.session, 'stale-run')).resolves.toBe(false);

        expect(fixture.session.cancelRun).toHaveBeenCalledWith('stale-run');
        expect(fixture.session.currentRun).not.toHaveBeenCalled();
        expect(fixture.session.cancelAsync).not.toHaveBeenCalled();
    });

    it('prefers the current run ID and never broad-cancels when no run snapshot exists', async () => {
        const fixture = createFixture();
        (fixture.session.currentRun as jest.Mock).mockResolvedValueOnce({ id: 'run-1' }).mockResolvedValueOnce(null);

        await expect(fixture.service.cancelRun(fixture.session)).resolves.toBe(true);
        expect(fixture.session.cancelRun).toHaveBeenCalledWith('run-1');
        expect(fixture.session.cancelAsync).not.toHaveBeenCalled();

        await expect(fixture.service.cancelRun(fixture.session)).resolves.toBe(false);
        expect(fixture.session.cancelAsync).not.toHaveBeenCalled();
    });

    it('does not initialize solely to shut down', async () => {
        const fixture = createFixture();

        await fixture.service.shutdown();
        await fixture.service.onModuleDestroy();

        expect(fixture.runtimeLoader).not.toHaveBeenCalled();
        expect(fixture.agent.close).not.toHaveBeenCalled();
        expect(fixture.service.isShuttingDown).toBe(true);
        expect(fixture.service.isReady).toBe(false);
        await expect(fixture.service.getAgent()).rejects.toBeInstanceOf(AiServiceClosedError);
    });

    it('closes the shared Agent exactly once during repeated shutdown', async () => {
        const fixture = createFixture();
        await fixture.service.ready();

        await Promise.all([fixture.service.shutdown(), fixture.service.shutdown(), fixture.service.onModuleDestroy()]);

        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('closes an Agent that finishes initialization during shutdown', async () => {
        const pendingAgent = deferred<AiAgent>();
        const fixture = createFixture({ createAgent: () => pendingAgent.promise });
        const initialization = fixture.service.getAgent();
        const shutdown = fixture.service.shutdown();

        pendingAgent.resolve(fixture.agent);

        await expect(initialization).rejects.toBeInstanceOf(AiServiceClosedError);
        await shutdown;
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('waits for an in-flight session acquisition and closes its late result', async () => {
        const fixture = createFixture();
        const pendingSession = deferred<AiSession>();
        (fixture.agent.sessionAsync as jest.Mock).mockReturnValue(pendingSession.promise);
        await fixture.service.ready();

        const acquisition = fixture.service.sessionAsync('/workspace');
        await waitUntil(() => (fixture.agent.sessionAsync as jest.Mock).mock.calls.length === 1);
        const shutdown = fixture.service.shutdown();
        expect(fixture.agent.close).not.toHaveBeenCalled();

        pendingSession.resolve(fixture.session);

        await expect(acquisition).rejects.toBeInstanceOf(AiServiceClosedError);
        await shutdown;
        expect(fixture.session.closeAsync).toHaveBeenCalledTimes(1);
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('preserves a late-session cleanup failure while shutdown still closes the Agent', async () => {
        const fixture = createFixture();
        const pendingSession = deferred<AiSession>();
        const cleanupError = new Error('late session close failed');
        const session = createSession({ closeAsync: jest.fn(async () => Promise.reject(cleanupError)) });
        (fixture.agent.sessionAsync as jest.Mock).mockReturnValue(pendingSession.promise);
        await fixture.service.ready();

        const acquisition = fixture.service.sessionAsync('/workspace');
        await waitUntil(() => (fixture.agent.sessionAsync as jest.Mock).mock.calls.length === 1);
        const shutdown = fixture.service.shutdown();
        pendingSession.resolve(session);

        await expect(acquisition).rejects.toMatchObject({ cleanupError });
        await shutdown;
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('propagates a close failure for an Agent that initializes during shutdown', async () => {
        const pendingAgent = deferred<AiAgent>();
        const fixture = createFixture({ createAgent: () => pendingAgent.promise });
        const closeError = new Error('agent close failed');
        (fixture.agent.close as jest.Mock).mockRejectedValue(closeError);
        const initialization = fixture.service.getAgent();
        const shutdown = fixture.service.shutdown();

        pendingAgent.resolve(fixture.agent);

        await expect(initialization).rejects.toBeInstanceOf(AiServiceClosedError);
        await expect(shutdown).rejects.toBe(closeError);
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });
});
