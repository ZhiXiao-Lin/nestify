# @a3s-lab/observability

## 0.2.0

### Minor Changes

- 7da01a6: Harden privacy defaults, collector bounds, reactive HTTP metrics, Prometheus invariants, health timeouts, and Nest dependency wiring.
- 52c5654: Harden runtime security and resource boundaries: install default-deny and rate-limit guards correctly, use atomic bounded rate limiting, and replace unbounded metric samples and labels with cumulative bounded series.

### Patch Changes

- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
- Updated dependencies [19802ca]
- Updated dependencies [08197dd]
  - @a3s-lab/http@0.2.0
