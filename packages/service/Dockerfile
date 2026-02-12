# =============================================================================
# Multi-stage Docker build for Notion Image CDN Service
# =============================================================================
# Stage 1: Build (compile TypeScript)
# Stage 2: Production (slim runtime, non-root user)
# =============================================================================

# --- Stage 1: Build ---
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy all workspace package.json files (lockfile expects both packages)
COPY packages/service/package.json ./packages/service/
COPY packages/sdk/package.json ./packages/sdk/

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy service source code
COPY packages/service/ ./packages/service/

# Build TypeScript
RUN cd packages/service && npx tsc -p tsconfig.build.json

# --- Stage 2: Production ---
FROM oven/bun:1-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy built output and production dependencies
COPY --from=builder /app/packages/service/dist ./dist
COPY --from=builder /app/packages/service/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create cache directory (for filesystem backend)
RUN mkdir -p /data/cache && chown appuser:appgroup /data/cache

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV STORAGE_BACKEND=fs
ENV CACHE_DIR=/data/cache

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the service
CMD ["bun", "dist/index.js"]
