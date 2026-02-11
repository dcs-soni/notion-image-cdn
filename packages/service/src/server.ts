// =============================================================================
// Server Factory
// =============================================================================
// Creates and configures the Fastify server instance. Separated from the
// entrypoint (index.ts) for testability — tests can create their own server
// instances without starting the HTTP listener.
// =============================================================================

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';

import { type ResolvedConfig, loadConfig } from './config/index.js';
import securityHeadersPlugin from './middleware/security-headers.js';
import requestIdPlugin from './middleware/request-id.js';
import authPlugin from './middleware/auth.js';
import { healthRoutes } from './routes/health.js';
import { proxyRoutes } from './routes/proxy.js';
import { imageRoutes } from './routes/image.js';
import { cacheRoutes } from './routes/cache.js';
import { FilesystemStorage } from './storage/filesystem.js';
import { S3Storage } from './storage/s3.js';
import type { StorageBackend } from './storage/interface.js';
import { MemoryCache, type EdgeCache } from './cache/memory.js';
import { RedisCache } from './cache/redis.js';

// Extend Fastify with our custom decorations
declare module 'fastify' {
  interface FastifyInstance {
    config: ResolvedConfig;
    storage: StorageBackend;
    edgeCache: EdgeCache | null;
  }
}

/**
 * Create and configure a Fastify server instance.
 * Does NOT start the HTTP listener — call server.listen() for that.
 */
export async function createServer(
  overrideConfig?: Partial<ResolvedConfig>,
): Promise<FastifyInstance> {
  // Load and validate configuration
  const config = overrideConfig
    ? ({ ...loadConfig(), ...overrideConfig } as ResolvedConfig)
    : loadConfig();

  // Create Fastify instance with Pino logging
  const server = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    // Trust proxy headers (for rate limiting behind reverse proxy)
    trustProxy: true,
    // Request ID generation is handled by our middleware
    genReqId: () => '',
    // Set body size limit (for POST endpoints in future phases)
    bodyLimit: 1024 * 1024, // 1MB
  });

  // ---------- Decorators ----------
  // Make config and services available to all route handlers
  server.decorate('config', config);

  // Initialize storage backend
  const storage = createStorageBackend(config);
  server.decorate('storage', storage);

  // Initialize edge cache (L2)
  const edgeCache = createEdgeCache(config, server);
  server.decorate('edgeCache', edgeCache);

  // ---------- Plugins ----------

  // CORS
  await server.register(fastifyCors, {
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    methods: ['GET', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: [
      'X-Request-Id',
      'X-Cache',
      'X-Cache-Tier',
      'X-Original-Size',
      'X-Optimized-Size',
    ],
    maxAge: 86400,
  });

  // Rate limiting
  await server.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    // Use IP-based rate limiting by default
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: (request, context) => ({
      error: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. ${context.max} requests per minute allowed. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
        requestId: (request as unknown as { requestId: string }).requestId ?? 'unknown',
      },
    }),
  });

  // Security headers
  await server.register(securityHeadersPlugin);

  // Request ID
  await server.register(requestIdPlugin);

  // Auth (skips if API_KEYS_ENABLED=false)
  await server.register(authPlugin, { config });

  // ---------- Routes ----------
  await server.register(healthRoutes);
  await server.register(proxyRoutes);
  await server.register(imageRoutes);
  await server.register(cacheRoutes);

  // ---------- Error Handler ----------
  server.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    const requestId =
      'requestId' in request ? (request as unknown as { requestId: string }).requestId : 'unknown';

    // Log the full error server-side
    request.log.error({ err: error, requestId }, 'Unhandled error');

    // Don't leak internal error details to clients
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: {
        status: statusCode,
        code: statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'An internal server error occurred' : error.message,
        requestId,
      },
    });
  });

  // ---------- Not Found Handler ----------
  server.setNotFoundHandler((request, reply) => {
    const requestId =
      'requestId' in request ? (request as unknown as { requestId: string }).requestId : 'unknown';

    reply.status(404).send({
      error: {
        status: 404,
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        requestId,
      },
    });
  });

  return server;
}

// =============================================================================
// Factory functions for storage and cache
// =============================================================================

function createStorageBackend(config: ResolvedConfig): StorageBackend {
  switch (config.STORAGE_BACKEND) {
    case 's3':
    case 'r2': {
      const bucket = config.S3_BUCKET;
      const accessKeyId = config.S3_ACCESS_KEY;
      const secretAccessKey = config.S3_SECRET_KEY;

      if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
          'S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY are required when STORAGE_BACKEND is s3 or r2',
        );
      }

      return new S3Storage({
        bucket,
        region: config.S3_REGION,
        endpoint: config.S3_ENDPOINT,
        accessKeyId,
        secretAccessKey,
      });
    }
    case 'fs':
    default:
      return new FilesystemStorage(config.CACHE_DIR);
  }
}

function createEdgeCache(config: ResolvedConfig, server: FastifyInstance): EdgeCache | null {
  if (config.REDIS_URL) {
    const redis = new RedisCache(config.REDIS_URL);
    server.log.info('Edge cache: Redis');

    // Clean up Redis connection on server close
    server.addHook('onClose', async () => {
      await redis.disconnect();
    });

    return redis;
  }

  // Fall back to in-memory cache
  server.log.info('Edge cache: in-memory (use REDIS_URL for production)');
  return new MemoryCache();
}
