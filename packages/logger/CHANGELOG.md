# @a3s-lab/logger

## 0.0.2

### Patch Changes

- fdc1e34: Correct Pino structured output, remove the duplicate self-referencing Nest provider and unused pino-http dependency, add validated secure redaction defaults, preserve Pino metadata integrity, use native child loggers, isolate concurrent HTTP request context, and bound untrusted request metadata.
- 19802ca: Add NestJS 11 peer compatibility while retaining NestJS 10 support, and validate HTTP integrations against Express 5.
