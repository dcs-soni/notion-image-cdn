# Multi-stage Docker build for Notion Image CDN Service

# Stage 1: Build (compile TypeScript)
# Stage 2: Production (slim runtime, non-root user)

FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./

COPY packages/service/package.json ./packages/service/
COPY packages/sdk/package.json ./packages/sdk/

RUN bun install --frozen-lockfile

COPY packages/service/ ./packages/service/

RUN cd packages/service && bunx tsc -p tsconfig.build.json

FROM oven/bun:1-alpine AS production

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY --from=builder /app/packages/service/dist ./dist
COPY --from=builder /app/packages/service/package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --production

RUN mkdir -p /data/cache && chown appuser:appgroup /data/cache

ENV NODE_ENV=production
ENV PORT=3002
ENV HOST=0.0.0.0

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["bun", "dist/index.js"]
