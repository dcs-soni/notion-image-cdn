// =============================================================================
// Health Check Route — GET /health
// =============================================================================

import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "../types/index.js";

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async (_request, reply) => {
    const storage = fastify.storage;
    const edgeCache = fastify.edgeCache;

    // Check subsystem health
    const [storageHealthy, cacheHealthy] = await Promise.all([
      storage.healthCheck().catch(() => false),
      edgeCache ? edgeCache.healthCheck().catch(() => false) : null,
    ]);

    const isHealthy = storageHealthy;
    const status = isHealthy ? "ok" : "degraded";

    const response: HealthResponse = {
      status,
      version: "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        storage: storageHealthy ? "ok" : "error",
        cache:
          cacheHealthy === null ? "disabled" : cacheHealthy ? "ok" : "error",
      },
    };

    reply.status(isHealthy ? 200 : 503).send(response);
  });
}
