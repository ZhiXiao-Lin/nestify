# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/kysely/package.json ./packages/kysely/
COPY packages/redisson/package.json ./packages/redisson/

# Install dependencies (production only for smaller image)
RUN pnpm install --frozen-lockfile --prod

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/kysely/package.json ./packages/kysely/
COPY packages/redisson/package.json ./packages/redisson/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json tsconfig.build.json ./
COPY apps/api/ ./apps/api/
COPY packages/kysely/ ./packages/kysely/
COPY packages/redisson/ ./packages/redisson/

# Build packages first, then the app
RUN pnpm --filter @a3s-lab/kysely build && \
    pnpm --filter @a3s-lab/redisson build && \
    pnpm --filter api build

# =============================================================================
# Stage 3: Runner (Production)
# =============================================================================
FROM node:20-alpine AS runner

# Install pnpm for runtime
RUN corepack enable && corepack prepare pnpm@latest --activate

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/kysely/node_modules ./packages/kysely/node_modules
COPY --from=deps /app/packages/redisson/node_modules ./packages/redisson/node_modules

# Copy built artifacts from builder stage
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/kysely/dist ./packages/kysely/dist
COPY --from=builder /app/packages/redisson/dist ./packages/redisson/dist

# Copy package.json files for runtime
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/kysely/package.json ./packages/kysely/
COPY --from=builder /app/packages/redisson/package.json ./packages/redisson/

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Environment variables
ENV NODE_ENV=production
ENV APP_PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/main.js"]
