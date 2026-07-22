# @a3s-lab/migrations

## 0.1.1

### Patch Changes

- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
- 10b46d5: Disable startup migrations by default in every environment and require an explicit module or environment opt-in.
- b921ee8: Validate migration configuration, add async NestJS registration and explicit runner execution, make custom name patterns deterministic, coalesce in-flight runs, and fail closed for every Kysely failure result.
- Updated dependencies [646bb34]
- Updated dependencies [19802ca]
- Updated dependencies [1984d90]
  - @a3s-lab/kysely@1.0.1
