// =============================================================================
// Proxy Route — GET /api/v1/proxy
// =============================================================================
// Primary endpoint: accepts an encoded Notion S3 URL and returns the image.
//
// Flow:
//   1. Validate URL (domain allowlist, HTTPS-only)
//   2. Parse transform options from query params
//   3. Generate cache key
//   4. Check L2 edge cache → if HIT, return immediately
//   5. Check L3 persistent storage → if HIT, populate L2 and return
//   6. On MISS: fetch from upstream, validate, optimize, store in L3 + L2
//   7. Return image with proper Cache-Control and diagnostic headers
// =============================================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateImageUrl } from '../lib/validator.js';
import { parseNotionUrl } from '../lib/url-parser.js';
import { fetchUpstreamImage, isFetchError } from '../lib/fetcher.js';
import { generateCacheKey } from '../lib/cache-key.js';
import { optimizeImage, negotiateFormat, parseTransformOptions } from '../lib/optimizer.js';
import type { ResolvedConfig } from '../config/index.js';
import type { ImageMetadata, CacheTier } from '../types/index.js';

export async function proxyRoutes(fastify: FastifyInstance) {
  const config: ResolvedConfig = fastify.config;

  fastify.get('/api/v1/proxy', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const rawUrl = typeof query['url'] === 'string' ? query['url'] : null;

    // ---------- Input Validation ----------
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

    // URL validation (Security Layers 1 & 2)
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

    // ---------- Parse Transform Options ----------
    const requestedTransform = parseTransformOptions(query);

    // Content negotiation: use Accept header to pick best format
    const negotiatedFormat = negotiateFormat(request.headers.accept, requestedTransform.format);
    if (negotiatedFormat !== 'original') {
      requestedTransform.format = negotiatedFormat;
    }

    // ---------- Cache Lookup ----------
    // Extract base URL (without S3 signature params) for cache key stability
    const parsed = parseNotionUrl(rawUrl);
    const cacheBaseUrl = parsed?.baseUrl ?? rawUrl.split('?')[0] ?? rawUrl;
    const cacheKey = generateCacheKey(cacheBaseUrl, requestedTransform);
    let cacheTier: CacheTier = 'ORIGIN';

    // L2: Edge cache lookup
    const edgeCache = fastify.edgeCache;
    if (edgeCache) {
      const l2Hit = await edgeCache.get(cacheKey);
      if (l2Hit) {
        cacheTier = 'L2_EDGE';
        return sendImageResponse(reply, l2Hit.data, l2Hit.contentType, cacheTier);
      }
    }

    // L3: Persistent storage lookup
    const storage = fastify.storage;
    const l3Hit = await storage.get(cacheKey);
    if (l3Hit) {
      cacheTier = 'L3_PERSISTENT';

      // Promote to L2 (fire-and-forget)
      if (edgeCache) {
        edgeCache
          .set(
            cacheKey,
            {
              data: l3Hit.data,
              contentType: l3Hit.metadata.contentType,
              cachedAt: Date.now(),
            },
            86400, // 24 hours TTL for L2
          )
          .catch(() => {}); // Silent failure — L2 is best-effort
      }

      return sendImageResponse(reply, l3Hit.data, l3Hit.metadata.contentType, cacheTier);
    }

    // ---------- Cache Miss: Fetch from Upstream ----------
    request.log.info({ url: rawUrl }, 'Cache miss — fetching from upstream');

    const fetchResult = await fetchUpstreamImage(rawUrl, {
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      maxSizeBytes: config.MAX_IMAGE_SIZE_BYTES,
      allowedDomains: config.allowedDomainsSet,
    });

    if (isFetchError(fetchResult)) {
      request.log.error(
        { url: rawUrl, status: fetchResult.status, code: fetchResult.code },
        'Upstream fetch failed',
      );
      return reply.status(fetchResult.status).send({
        error: {
          status: fetchResult.status,
          code: fetchResult.code,
          message: fetchResult.message,
          requestId: request.requestId,
        },
      });
    }

    // ---------- Image Optimization ----------
    let outputData: Buffer = fetchResult.data;
    let outputContentType: string = fetchResult.contentType;
    let width: number | undefined;
    let height: number | undefined;

    try {
      const optimized = await optimizeImage(fetchResult.data, requestedTransform);
      outputData = optimized.data;
      outputContentType = optimized.contentType;
      width = optimized.width;
      height = optimized.height;
    } catch (err: unknown) {
      // If optimization fails, serve the original image
      request.log.warn({ err }, 'Image optimization failed, serving original');
    }

    // ---------- Store in Cache ----------
    const metadata: ImageMetadata = {
      originalUrl: rawUrl,
      contentType: outputContentType,
      originalSize: fetchResult.originalSize,
      cachedSize: outputData.length,
      width,
      height,
      workspaceId: parsed?.workspaceId,
      blockId: parsed?.blockId,
      cachedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0,
    };

    // Store in L3 (persistent)
    storage.put(cacheKey, outputData, metadata).catch((err) => {
      request.log.error({ err, cacheKey }, 'Failed to store in persistent cache');
    });

    // Store in L2 (edge) — fire-and-forget
    if (edgeCache) {
      edgeCache
        .set(
          cacheKey,
          {
            data: outputData,
            contentType: outputContentType,
            cachedAt: Date.now(),
          },
          86400, // 24 hours
        )
        .catch(() => {});
    }

    // ---------- Respond ----------
    return sendImageResponse(
      reply,
      outputData,
      outputContentType,
      'ORIGIN',
      fetchResult.originalSize,
    );
  });
}

/**
 * Send an image response with proper headers.
 */
function sendImageResponse(
  reply: FastifyReply,
  data: Buffer,
  contentType: string,
  cacheTier: CacheTier,
  originalSize?: number,
) {
  reply
    .header('Content-Type', contentType)
    .header('Content-Length', data.length)
    // L1 browser cache: 1 hour + stale-while-revalidate
    .header('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600')
    .header('X-Cache', cacheTier === 'ORIGIN' ? 'MISS' : 'HIT')
    .header('X-Cache-Tier', cacheTier)
    .header('X-Optimized-Size', String(data.length));

  if (originalSize !== undefined) {
    reply.header('X-Original-Size', String(originalSize));
  }

  return reply.send(data);
}
