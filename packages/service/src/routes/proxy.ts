// Proxy Route — GET /api/v1/proxy
//
// Flow:
//   1. Validate URL (domain allowlist, HTTPS-only)
//   2. Parse transform options from query params
//   3. Delegate to shared image pipeline (cache check → fetch → optimize → store → respond)

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateImageUrl } from '../lib/validator.js';
import { parseNotionUrl } from '../lib/url-parser.js';
import { runImagePipeline } from '../lib/image-pipeline.js';
import type { ResolvedConfig } from '../config/index.js';

export async function proxyRoutes(fastify: FastifyInstance) {
  const config: ResolvedConfig = fastify.config;

  fastify.get('/api/v1/proxy', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const rawUrl = typeof query['url'] === 'string' ? query['url'] : null;

    if (!rawUrl) {
      return reply.status(400).send({
        error: {
          status: 400,
          code: 'MISSING_URL',
          message:
            'The "url" query parameter is required. Example: /api/v1/proxy?url=<encoded-notion-url>',
          requestId: request.requestId,
        },
      });
    }

    const validation = validateImageUrl(rawUrl, config.allowedDomainsSet);
    if (!validation.valid) {
      request.log.warn({ url: rawUrl, error: validation.errorCode }, 'URL validation failed');
      return reply.status(403).send({
        error: {
          status: 403,
          code: validation.errorCode ?? 'FORBIDDEN',
          message: validation.error ?? 'URL not allowed',
          requestId: request.requestId,
        },
      });
    }

    const parsed = parseNotionUrl(rawUrl);
    const cacheBaseUrl = parsed?.baseUrl ?? rawUrl.split('?')[0] ?? rawUrl;

    return runImagePipeline(
      cacheBaseUrl,
      request,
      reply,
      config,
      fastify.storage,
      fastify.edgeCache,
      {
        upstreamUrl: rawUrl,
        upstreamErrorMode: 'relay',
        meta: {
          workspaceId: parsed?.workspaceId,
          blockId: parsed?.blockId,
        },
      },
    );
  });
}
