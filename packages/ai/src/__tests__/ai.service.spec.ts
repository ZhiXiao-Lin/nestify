import { AiService } from '../ai.service';
import type { AiAgent, AiAgentEvent, AiRuntime, AiSession, AiSessionRequest } from '../ai.types';

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
        close: jest.fn(async () => undefined),
    } as unknown as AiAgent;
    const create = jest.fn(options.createAgent ?? (async () => agent));
    const runtime: AiRuntime = { Agent: { create } };
    const runtimeLoader = jest.fn(async () => runtime);
    const service = new AiService({ configSource: 'agent.acl', runtimeLoader });
    return { agent, create, replacement, runtimeLoader, service, session };
}

describe('AiService initialization', () => {
    it('is lazy and coalesces concurrent initialization calls', async () => {
        const fixture = createFixture();

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

    it('validates configuration and custom runtime loader results', async () => {
        const emptyConfig = new AiService({ configSource: '   ', runtimeLoader: jest.fn() });
        const invalidRuntime = new AiService({
            configSource: 'agent.acl',
            runtimeLoader: async () => ({}) as AiRuntime,
        });

        await expect(emptyConfig.ready()).rejects.toThrow('non-empty configSource');
        await expect(invalidRuntime.ready()).rejects.toThrow('did not provide Agent.create');
    });
});

describe('AiService sessions', () => {
    it('delegates async create, resume, and replacement without adding a queue', async () => {
        const fixture = createFixture();
        const sessionOptions = { model: 'test/model' };

        await expect(fixture.service.sessionAsync('/workspace', sessionOptions)).resolves.toBe(fixture.session);
        await expect(fixture.service.resumeSessionAsync('session-1', sessionOptions)).resolves.toBe(fixture.session);
        await expect(fixture.service.replaceSessionAsync(fixture.session, sessionOptions)).resolves.toBe(
            fixture.replacement,
        );
        await expect(fixture.service.replace(fixture.session, sessionOptions)).resolves.toBe(fixture.replacement);

        expect(fixture.agent.sessionAsync).toHaveBeenCalledWith('/workspace', sessionOptions);
        expect(fixture.agent.resumeSessionAsync).toHaveBeenCalledWith('session-1', sessionOptions);
        expect(fixture.agent.replaceSessionAsync).toHaveBeenNthCalledWith(1, fixture.session, sessionOptions);
        expect(fixture.agent.replaceSessionAsync).toHaveBeenNthCalledWith(2, fixture.session, sessionOptions);
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

    it('closes a disposable session when a run fails', async () => {
        const runError = Object.assign(new Error('run failed'), { code: 'SESSION_BUSY' });
        const session = createSession({
            send: jest.fn(async () => Promise.reject(runError)),
            closeAsync: jest.fn(async () => Promise.reject(new Error('close failed'))),
        });
        const fixture = createFixture();
        (fixture.agent.sessionAsync as jest.Mock).mockResolvedValue(session);

        await expect(fixture.service.run('/workspace', 'fail')).rejects.toBe(runError);
        expect(session.closeAsync).toHaveBeenCalledTimes(1);
    });

    it('requires a request for the positional one-shot form', async () => {
        const fixture = createFixture();

        await expect(fixture.service.run('/workspace', undefined as never)).rejects.toThrow('requires a request');
        expect(fixture.agent.sessionAsync).not.toHaveBeenCalled();
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

    it('closes the disposable session if native stream creation fails', async () => {
        const fixture = createFixture();
        const streamError = Object.assign(new Error('stream failed'), { code: 'SESSION_BUSY' });
        (fixture.session.stream as jest.Mock).mockRejectedValue(streamError);
        (fixture.session.closeAsync as jest.Mock).mockRejectedValue(new Error('close failed'));

        const consume = async () => {
            for await (const _item of fixture.service.stream('/workspace', 'fail')) {
                // The stream rejects before yielding.
            }
        };

        await expect(consume()).rejects.toBe(streamError);
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
        await expect(fixture.service.getAgent()).rejects.toThrow('has been shut down');
    });

    it('closes the shared Agent exactly once during repeated shutdown', async () => {
        const fixture = createFixture();
        await fixture.service.ready();

        await Promise.all([fixture.service.shutdown(), fixture.service.shutdown(), fixture.service.onModuleDestroy()]);

        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('closes an Agent that finishes initialization during shutdown', async () => {
        let resolveAgent!: (agent: AiAgent) => void;
        const pendingAgent = new Promise<AiAgent>(resolve => {
            resolveAgent = resolve;
        });
        const fixture = createFixture({ createAgent: () => pendingAgent });
        const initialization = fixture.service.getAgent();
        const shutdown = fixture.service.shutdown();

        resolveAgent(fixture.agent);

        await expect(initialization).rejects.toThrow('has been shut down');
        await shutdown;
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });

    it('propagates a close failure for an Agent that initializes during shutdown', async () => {
        let resolveAgent!: (agent: AiAgent) => void;
        const pendingAgent = new Promise<AiAgent>(resolve => {
            resolveAgent = resolve;
        });
        const fixture = createFixture({ createAgent: () => pendingAgent });
        const closeError = new Error('agent close failed');
        (fixture.agent.close as jest.Mock).mockRejectedValue(closeError);
        const initialization = fixture.service.getAgent();
        const shutdown = fixture.service.shutdown();

        resolveAgent(fixture.agent);

        await expect(initialization).rejects.toThrow('has been shut down');
        await expect(shutdown).rejects.toBe(closeError);
        expect(fixture.agent.close).toHaveBeenCalledTimes(1);
    });
});
