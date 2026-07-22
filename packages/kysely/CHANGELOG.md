# @a3s-lab/kysely

## 1.0.1

### Patch Changes

- 646bb34: Require Kysely 0.28.14 or newer within the 0.28 release line and keep workspace consumers on one resolved version.
- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
- 1984d90: Validate Kysely and PostgreSQL configuration, honor caller-owned instances, make owned connection shutdown idempotent, and bound SQL diagnostics with sensitive parameters and stacks disabled by default.
