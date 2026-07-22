# @a3s-lab/ai

A strict NestJS lifecycle boundary around the native [`@a3s-lab/code`](https://www.npmjs.com/package/@a3s-lab/code)
SDK. It embeds the first-party runtime in the Nest process, validates the SDK contract, and owns Agent/session cleanup; it
does not proxy the A3S CLI or invent an HTTP, WebSocket, or JSON-RPC protocol.

## Install

Install the wrapper and its native peer:

```bash
pnpm add @a3s-lab/ai @a3s-lab/code
```

`@a3s-lab/code` is a peer dependency so the application controls the native binary version. This package supports SDK
versions `>=5.3.2 <7`. Importing `@a3s-lab/ai` does not synchronously load the native addon; it is loaded only when the
service is initialized.

## Use

### Configure the module

Registration is non-global and lazy by default. `configSource` is an ACL file path or inline ACL accepted by
`Agent.create`; JSON configuration is not supported by A3S Code.

```ts
import { Module } from '@nestjs/common';
import { AiModule } from '@a3s-lab/ai';

@Module({
    imports: [
        AiModule.register({
            configSource: 'agent.acl',
            eager: true,
        }),
    ],
})
export class AppModule {}
```

Use `registerAsync` when configuration comes from another provider. Set `isGlobal: true` explicitly only when a global
module is intended.

```ts
AiModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        configSource: config.getOrThrow<string>('A3S_CODE_CONFIG'),
        eager: false,
    }),
})
```

`runtimeLoader` can be supplied in module options for tests or controlled runtime loading. Production applications
normally leave it unset. Both registration forms validate and detach their resolved options. Invalid `configSource`,
`eager`, `isGlobal`, or loader values therefore fail during module construction or async provider resolution instead of
waiting for the first request. Resolved options are frozen so later caller mutation cannot change runtime behavior.

| Option | Default | Purpose |
| --- | --- | --- |
| `configSource` | Required | ACL path or inline ACL source passed unchanged to `Agent.create`. |
| `eager` | `false` | Initialize the native Agent in `onModuleInit`; otherwise initialize on first use. |
| `isGlobal` | `false` | Make the dynamic Nest module global. For `registerAsync`, set this on the registration object. |
| `runtimeLoader` | Dynamic `import('@a3s-lab/code')` | Override lazy SDK loading for tests or controlled deployments. |

### Use sessions and one-shot runs

`ready()` initializes the shared `Agent`; `getAgent()` returns it. Both are idempotent. Long-lived sessions expose the
native SDK without changing its fail-fast, single-flight behavior.

```ts
const session = await ai.sessionAsync('/srv/workspaces/project', {
    sessionId: 'project-42',
    tenantId: 'tenant-7',
});

const result = await session.send({ prompt: 'Explain the authentication flow' });
await session.closeAsync();
```

`resumeSessionAsync` and `replaceSessionAsync` delegate to the corresponding native APIs. Resume requires a configured
session store. Named definitions and in-memory worker definitions are available without dropping down to the Agent:

```ts
const explorer = await ai.sessionForAgentAsync('/srv/workspaces/project', 'explore', ['/srv/agents']);
const reviewer = await ai.sessionForWorkerAsync('/srv/workspaces/project', {
    name: 'reviewer',
    description: 'Review the current change without modifying files',
    kind: 'reviewer',
});

const ids = await ai.listSessions();
await ai.closeSession(ids[0]);
```

`withSession` is the safe escape hatch for multi-step work: it supplies the full native `Session` and closes it after the
callback. If both work and cleanup fail, `AiResourceCleanupError` preserves both failures instead of silently discarding
one.

```ts
const runs = await ai.withSession('/srv/workspaces/project', async session => {
    await session.send('Inspect the failing tests');
    return session.runs();
});
```

For one request, `run` creates the same kind of disposable session and always closes it:

```ts
const requestAbortController = new AbortController();
const result = await ai.run({
    workspace: '/srv/workspaces/project',
    request: { prompt: 'Run the relevant tests' },
    sessionOptions: { maxExecutionTimeMs: 300_000 },
    signal: requestAbortController.signal,
});
```

The equivalent positional form is `ai.run(workspace, request, sessionOptions?)`. The wrapper does not queue overlapping
operations. A native `SESSION_BUSY` error remains a `SESSION_BUSY` error; branch on its stable `code`, not its message.
`AbortSignal` is supported by the object form for disposable `run` and `stream` calls. Aborting invokes the native async
session cancellation path, rejects with `AiOperationAbortedError` (`code: 'AI_OPERATION_ABORTED'`), and still waits for
session cleanup. Long-lived sessions should use `cancelRun` as described below.

## Exports

- `AiModule`: synchronous and asynchronous NestJS module registration.
- `AiService`: agent lifecycle, standard/named/worker sessions, control-plane helpers, disposable callbacks, one-shot
  runs, streaming, cancellation, and shutdown operations.
- `AI_MODULE_OPTIONS`: injection token for resolved module options.
- `AiConfigurationError`, `AiSdkContractError`, `AiServiceClosedError`, `AiOperationAbortedError`, and
  `AiResourceCleanupError`: stable wrapper-boundary errors. Native SDK failures retain their native classes and codes.
- Public option, runtime, agent, worker, session, callback, request, result, event, and error TypeScript types.

## Notes

### Stream, cancel, and shut down

`stream` is an async generator over the native event stream. It forwards each event object unchanged, including the
open version-one envelope `{ version, type, payload, metadata? }`, and closes its disposable session in `finally`. A
consumer that stops early therefore still triggers cleanup.

```ts
for await (const event of ai.stream('/srv/workspaces/project', { prompt: 'Fix the failing test' })) {
    switch (event.type) {
        case 'text_delta':
            process.stdout.write(event.text ?? '');
            break;
        case 'agent_end':
        case 'error':
            break;
        default:
            // Event names are open for forward compatibility; preserve payload and metadata.
            observe(event);
    }
}
```

For a long-lived session, `cancelRun(session, runId)` uses run-scoped cancellation. An explicit stale ID returns `false`
and never falls back to cancelling a newer run. Without an ID, the service reads `currentRun()` and still prefers
run-scoped cancellation; it returns `false` when no current run snapshot exists rather than racing a later run with
broad session cancellation.

Nest shutdown stops admitting new operations, waits for any session construction already in flight, closes a session
that finishes construction during that drain, and then calls `Agent.close()` once. The Agent closes all remaining live
sessions and agent-owned background resources. Calling `shutdown()` manually is also idempotent. `isReady` and
`isShuttingDown` expose lifecycle state; after shutdown begins, initialization and new sessions are rejected with
`AiServiceClosedError`.

### Validation and error boundaries

The wrapper validates non-empty workspace/session/run identifiers, request prompts, session option shapes, custom SDK
loader results, Agent methods, Session methods, stream iterables, and control-plane return values. This catches wiring or
version errors at the Nest boundary while leaving evolving native option fields, event payloads, and native stable error
codes untouched. A custom `runtimeLoader` must provide the supported `@a3s-lab/code` Agent contract, including the async
session lifecycle and session control-plane methods.
