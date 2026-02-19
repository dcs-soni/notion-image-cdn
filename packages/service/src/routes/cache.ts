import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateCachePrefix } from '../lib/cache-key.js';

export async function cacheRoutes(fastify: FastifyInstance) {
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
        request.log.info({ pageId }, 'Cache purge by page_id requested (not yet implemented)');
        return reply.status(501).send({
          error: {
            status: 501,
            code: 'NOT_IMPLEMENTED',
            message:
              'Cache purge by page_id is not yet implemented. Use ?url=<encoded-url> to purge individual images.',
            requestId: request.requestId,
          },
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

  fastify.get('/api/v1/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'ok',
      message: 'Statistics endpoint. Detailed metrics available in Phase 4 (Dashboard).',
      storage: fastify.storage.name(),
      cache: fastify.edgeCache?.name() ?? 'disabled',
    });
  });
}
