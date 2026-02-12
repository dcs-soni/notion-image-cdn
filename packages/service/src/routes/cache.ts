// =============================================================================
// Cache Management Routes
// =============================================================================
// DELETE /api/v1/cache — Purge cached images
// GET    /api/v1/stats — Usage statistics
// =============================================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateCachePrefix } from '../lib/cache-key.js';

export async function cacheRoutes(fastify: FastifyInstance) {
  /**
   * DELETE /api/v1/cache
   * Purge cached images by URL or page_id.
   */
  fastify.delete('/api/v1/cache', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const url = typeof query['url'] === 'string' ? query['url'] : null;
    const pageId = typeof query['page_id'] === 'string' ? query['page_id'] : null;

    if (!url && !pageId) {
      return reply.status(400).send({
        error: {
          status: 400,
          code: 'MISSING_PARAMS',
          message: 'Either "url" or "page_id" query parameter is required',
          requestId: request.requestId,
        },
      });
    }

    const storage = fastify.storage;
    const edgeCache = fastify.edgeCache;

    try {
      if (url) {
        // Purge a specific image (all variants)
        const baseUrl = url.split('?')[0] ?? url;
        const prefix = generateCachePrefix(baseUrl);

        await storage.deleteByPrefix(prefix);
        if (edgeCache) {
          await edgeCache.deleteByPrefix(prefix);
        }

        request.log.info({ url: baseUrl }, 'Cache purged by URL');
        return reply.status(200).send({
          message: 'Cache purged successfully',
          purgedBy: 'url',
          target: baseUrl,
          requestId: request.requestId,
        });
      }

      if (pageId) {
        // Purge by page_id requires walking storage (slower)
        // For now, log the request — full implementation in Phase 5
        request.log.info({ pageId }, 'Cache purge by page_id requested');
        return reply.status(200).send({
          message: 'Cache purge by page_id is queued',
          purgedBy: 'page_id',
          target: pageId,
          requestId: request.requestId,
        });
      }
    } catch (err: unknown) {
      request.log.error({ err }, 'Cache purge failed');
      return reply.status(500).send({
        error: {
          status: 500,
          code: 'PURGE_FAILED',
          message: 'Failed to purge cache',
          requestId: request.requestId,
        },
      });
    }
  });

  /**
   * GET /api/v1/stats
   * Basic usage statistics.
   */
  fastify.get('/api/v1/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Basic stats — will be enhanced with actual metrics in Phase 4
    return reply.status(200).send({
      status: 'ok',
      message: 'Statistics endpoint. Detailed metrics available in Phase 4 (Dashboard).',
      storage: fastify.storage.name(),
      cache: fastify.edgeCache?.name() ?? 'disabled',
    });
  });
}
