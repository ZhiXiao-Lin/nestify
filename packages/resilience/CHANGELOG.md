# @a3s-lab/resilience

## 0.2.0

### Minor Changes

- 52c5654: Harden runtime security and resource boundaries: install default-deny and rate-limit guards correctly, use atomic bounded rate limiting, and replace unbounded metric samples and labels with cumulative bounded series.
- ddf6fb9: Harden retry cancellation and filtering, half-open circuit concurrency, cache stampede and stale-write behavior, bounded rate-limit storage, distributed-lock cleanup, and Nest module dependency wiring.

### Patch Changes

- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
- Updated dependencies [19802ca]
- Updated dependencies [61b0e35]
  - @a3s-lab/redisson@1.1.0
