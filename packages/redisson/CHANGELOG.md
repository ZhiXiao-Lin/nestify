# @a3s-lab/redisson

## 1.1.0

### Minor Changes

- 61b0e35: Replace blocking pattern deletion with bounded cluster-aware SCAN and UNLINK, coalesce cache misses, preserve cache value types and mutation ordering, track manual lock ownership, harden callback and unlock error precedence, validate runtime options, make shutdown bounded and idempotent, and align consumer verification with the TypeScript 5.7.2 dependency baseline.

### Patch Changes

- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
