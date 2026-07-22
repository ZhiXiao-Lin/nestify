# @a3s-lab/cqrs

## 0.2.0

### Minor Changes

- ad80fa0: Add deterministic and bounded domain-event batch publication, configurable Nest module wiring, ordered/parallel/native strategies, runtime validation, and complete multi-failure reporting.

### Patch Changes

- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
- 3760b9c: Strengthen domain invariants with validated entity identity, bounded structural value-object snapshots, readonly aggregate event publishing, defensive chronological timestamps, finite guards, normalized Result failures, and registry-backed DI tokens.
- Updated dependencies [3760b9c]
  - @a3s-lab/ddd@0.2.0
