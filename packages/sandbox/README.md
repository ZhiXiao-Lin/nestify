# @a3s-lab/sandbox

NestJS lifecycle integration for the first-party A3S Box TypeScript SDK. The service returns the SDK's native
Sandbox and Code Interpreter instances, so commands, files, PTY, volumes, filesystem snapshots, and interpreter
features remain available without a parallel wrapper object.

## Install

```bash
pnpm add @a3s-lab/sandbox @nestjs/common
```

This package pins `@a3s-lab/box` 3.0.11 to the immutable A3S Box GitHub Release tarball. It does not depend directly
on `e2b` or `@e2b/code-interpreter`, and can move to the npm-published first-party package without changing its public
NestJS API.

The supported Node.js range is `>=20.18.1 <21 || >=22`, matching the first-party SDK's pinned dependency graph.
TypeScript 5.3 or newer is required to consume the emitted declarations, which use TypeScript's ESM
`resolution-mode` import attributes.

## Use

### Configuration

```ts
import { Module } from '@nestjs/common';
import { SandboxModule } from '@a3s-lab/sandbox';

@Module({
    imports: [
        SandboxModule.register({
            connection: {
                apiUrl: 'https://api.box.example.com',
                apiKey: process.env.A3S_BOX_API_KEY,
            },
            defaultTemplate: 'code-interpreter-v1',
            defaultTimeoutMs: 60_000,
            killOnShutdown: true,
        }),
    ],
})
export class AppModule {}
```

`registerAsync` accepts the usual Nest factory, class, and existing-provider forms. Modules are non-global by default;
set `isGlobal: true` explicitly if one application-wide service is intended. Module-owned connection fields override
per-call SDK options, and `validateApiKey` is always `false` for A3S credentials.

The Nest wrapper and `createA3SBoxConnectionConfig()` do not read or rewrite `E2B_*` variables. A3S Box 3.0.11,
however, re-exports compatibility classes backed by its pinned transport, which can still consult ambient `E2B_*`
values for unspecified transport fields. For strict A3S-only routing, start the process without `E2B_*` variables;
the wrapper cannot override every inherited transport field until the first-party SDK removes that fallback.

`createA3SBoxConnectionConfig()` exposes the same endpoint validation and `api.<domain>` derivation rules without
loading the ESM SDK:

```ts
import { createA3SBoxConnectionConfig } from '@a3s-lab/sandbox';

const connection = createA3SBoxConnectionConfig({
    apiUrl: 'https://api.box.example.com',
    apiKey: 'a3s_example',
});
// { apiUrl, domain: 'box.example.com', apiKey, validateApiKey: false }
```

### Managed sandbox usage

```ts
import { Injectable } from '@nestjs/common';
import { SandboxService } from '@a3s-lab/sandbox';

@Injectable()
export class JobsService {
    constructor(private readonly sandboxes: SandboxService) {}

    run(): Promise<string> {
        return this.sandboxes.withSandbox(async sandbox => {
            const result = await sandbox.commands.run('node -e "console.log(6 * 7)"');
            return result.stdout;
        });
    }
}
```

`create(options?)` delegates to the first-party SDK's native default template when `defaultTemplate` is omitted.
Use `create(template, options?)` to select a template per call; a module-level `defaultTemplate` takes precedence only
when the call does not provide one.

## Exports

- `SandboxModule` and its sync/async registration option types
- `SandboxService`
- `createA3SBoxConnectionConfig()`
- Native A3S Box sandbox, code-interpreter, connection, and operation types

## Notes

`create()` and `createCodeInterpreter()` create owned instances. `withSandbox()` and `withCodeInterpreter()` always
attempt to kill those instances after the callback. `connect()` and `connectCodeInterpreter()` return unowned instances
and are never killed automatically. Use `release(instance)` to transfer ownership or `kill(instance)` for idempotent
service-managed cleanup. On Nest shutdown, the service waits for in-flight creates and explicit kills, and all remaining
owned instances are killed with settled-result semantics unless `killOnShutdown` is false. An instance whose creation
finishes only after shutdown begins is killed before the rejected create operation settles, so it cannot leak. Both SDK
entrypoints are loaded only when their first operation runs, so requiring this CommonJS package root does not
synchronously load the SDK's ESM modules.

A3S Box 3.0.11 production-tests a useful E2B-compatible subset: create/connect/get/list, timeout and kill,
memory-preserving pause/connect-resume, current metrics and logs, foreground/background commands, stdin, PTY,
filesystem operations, volumes, filesystem snapshots, and Python Code Interpreter contexts.

The upstream compatibility manifest still reports `full_compatibility=false`. Templates/build APIs, filesystem-only
pause, historical metric retention, signed files, MCP execution, additional process signals, reconnect and cancellation,
large/multi-file edge cases, and the complete public-port/streaming matrix are not release claims. Resource and isolation
policy are selected by the server's A3S template policy; this Nest module intentionally does not invent client-side CPU,
memory, PID, seccomp, capability, or backend-fallback controls.
