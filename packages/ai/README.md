# @a3s-lab/ai

A thin NestJS lifecycle wrapper around the native [`@a3s-lab/code`](https://www.npmjs.com/package/@a3s-lab/code)
SDK. It embeds the runtime in the Nest process; it does not proxy the A3S CLI or invent an HTTP, WebSocket, or JSON-RPC
protocol.

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
normally leave it unset.

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
session store. For one request, `run` creates a disposable session and closes it in `finally` on success or failure:

```ts
const result = await ai.run({
    workspace: '/srv/workspaces/project',
    request: { prompt: 'Run the relevant tests' },
    sessionOptions: { maxExecutionTimeMs: 300_000 },
});
```

The equivalent positional form is `ai.run(workspace, request, sessionOptions?)`. The wrapper does not queue overlapping
operations. A native `SESSION_BUSY` error remains a `SESSION_BUSY` error; branch on its stable `code`, not its message.

## Exports

- `AiModule`: synchronous and asynchronous NestJS module registration.
- `AiService`: agent lifecycle, session, one-shot run, streaming, cancellation, and shutdown operations.
- `AI_MODULE_OPTIONS`: injection token for resolved module options.
- Public option, runtime, agent, session, request, result, event, and error TypeScript types.

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

Nest shutdown calls `Agent.close()` once, which closes all live sessions and agent-owned background resources. Calling
`shutdown()` manually is also idempotent. After shutdown, initialization and new sessions are rejected.
