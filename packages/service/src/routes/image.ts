// =============================================================================
// Clean URL Route — GET /img/:workspaceId/:blockId/:filename
// =============================================================================
// Provides permanent, human-readable URLs for Notion images.
// These URLs never change — even when the underlying S3 signed URL expires.
//
// The route reconstructs the S3 path and delegates to the same proxy logic.
// =============================================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchUpstreamImage, isFetchError } from '../lib/fetcher.js';
import { generateCacheKey } from '../lib/cache-key.js';
import { optimizeImage, negotiateFormat, parseTransformOptions } from '../lib/optimizer.js';
import type { ResolvedConfig } from '../config/index.js';
import type { ImageMetadata, CacheTier } from '../types/index.js';

interface ImageParams {
  workspaceId: string;
  blockId: string;
  filename: string;
}

/** The known Notion S3 host for reconstruction */
const NOTION_S3_HOST = 'https://prod-files-secure.s3.us-west-2.amazonaws.com';

export async function imageRoutes(fastify: FastifyInstance) {
  const config: ResolvedConfig = fastify.config;

  fastify.get<{ Params: ImageParams }>(
    '/img/:workspaceId/:blockId/:filename',
    async (request: FastifyRequest<{ Params: ImageParams }>, reply: FastifyReply) => {
      const { workspaceId, blockId, filename } = request.params;

      // Basic param validation
      if (!workspaceId || !blockId || !filename) {
        return reply.status(400).send({
          error: {
            status: 400,
            code: 'MISSING_PARAMS',
            message: 'workspaceId, blockId, and filename are required',
            requestId: request.requestId,
          },
        });
      }

      // Validate params don't contain path traversal
      if (
        containsPathTraversal(workspaceId) ||
        containsPathTraversal(blockId) ||
        containsPathTraversal(filename)
      ) {
        return reply.status(400).send({
          error: {
            status: 400,
            code: 'INVALID_PARAMS',
            message: 'Invalid characters in URL parameters',
            requestId: request.requestId,
          },
        });
      }

      // ---------- Parse Transform Options ----------
      const query = request.query as Record<string, unknown>;
      const requestedTransform = parseTransformOptions(query);

      const negotiatedFormat = negotiateFormat(request.headers.accept, requestedTransform.format);
      if (negotiatedFormat !== 'original') {
        requestedTransform.format = negotiatedFormat;
      }

      // ---------- Cache Lookup ----------
      // Cache key is based on path components (stable, not expiring)
      const cacheBaseUrl = `${NOTION_S3_HOST}/${workspaceId}/${blockId}/${filename}`;
      const cacheKey = generateCacheKey(cacheBaseUrl, requestedTransform);
      let cacheTier: CacheTier = 'ORIGIN';

      // L2: Edge cache
      const edgeCache = fastify.edgeCache;
      if (edgeCache) {
        const l2Hit = await edgeCache.get(cacheKey);
        if (l2Hit) {
          cacheTier = 'L2_EDGE';
          return sendResponse(reply, l2Hit.data, l2Hit.contentType, cacheTier);
        }
      }

      // L3: Persistent storage
      const storage = fastify.storage;
      const l3Hit = await storage.get(cacheKey);
      if (l3Hit) {
        cacheTier = 'L3_PERSISTENT';

        if (edgeCache) {
          edgeCache
            .set(
              cacheKey,
              {
                data: l3Hit.data,
                contentType: l3Hit.metadata.contentType,
                cachedAt: Date.now(),
              },
              86400,
            )
            .catch(() => {});
        }

        return sendResponse(reply, l3Hit.data, l3Hit.metadata.contentType, cacheTier);
      }

      // ---------- Cache Miss ----------
      // We need a valid signed URL to fetch from Notion.
      // The clean URL doesn't contain S3 signing params, so we attempt
      // to fetch using the base URL (which may fail if Notion requires signing).
      // In practice, the image should have been cached via /api/v1/proxy first.
      const upstreamUrl = cacheBaseUrl;
      request.log.info(
        { workspaceId, blockId, filename },
        'Cache miss on clean URL — attempting upstream fetch',
      );

      const fetchResult = await fetchUpstreamImage(upstreamUrl, {
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
        maxSizeBytes: config.MAX_IMAGE_SIZE_BYTES,
        allowedDomains: config.allowedDomainsSet,
      });

      if (isFetchError(fetchResult)) {
        // If unsigned fetch fails, return 404 with helpful message
        if (
          fetchResult.status === 502 ||
          fetchResult.status === 403 ||
          fetchResult.status === 404
        ) {
          return reply.status(404).send({
            error: {
              status: 404,
              code: 'IMAGE_NOT_CACHED',
              message:
                'This image is not yet cached. Use /api/v1/proxy?url=<encoded-notion-url> to cache it first, then access it via this clean URL.',
              requestId: request.requestId,
            },
          });
        }
        return reply.status(fetchResult.status).send({
          error: {
            status: fetchResult.status,
            code: fetchResult.code,
            message: fetchResult.message,
            requestId: request.requestId,
          },
        });
      }

      // Optimize and cache
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
      } catch {
        request.log.warn('Image optimization failed on clean URL route, serving original');
      }

      const metadata: ImageMetadata = {
        originalUrl: upstreamUrl,
        contentType: outputContentType,
        originalSize: fetchResult.originalSize,
        cachedSize: outputData.length,
        width,
        height,
        workspaceId,
        blockId,
        cachedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        accessCount: 0,
      };

      storage.put(cacheKey, outputData, metadata).catch((err) => {
        request.log.error({ err }, 'Failed to store in L3');
      });

      if (edgeCache) {
        edgeCache
          .set(
            cacheKey,
            {
              data: outputData,
              contentType: outputContentType,
              cachedAt: Date.now(),
            },
            86400,
          )
          .catch(() => {});
      }

      return sendResponse(reply, outputData, outputContentType, 'ORIGIN', fetchResult.originalSize);
    },
  );
}

function sendResponse(
  reply: FastifyReply,
  data: Buffer,
  contentType: string,
  cacheTier: CacheTier,
  originalSize?: number,
) {
  reply
    .header('Content-Type', contentType)
    .header('Content-Length', data.length)
    .header('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600')
    .header('X-Cache', cacheTier === 'ORIGIN' ? 'MISS' : 'HIT')
    .header('X-Cache-Tier', cacheTier)
    .header('X-Optimized-Size', String(data.length));

  if (originalSize !== undefined) {
    reply.header('X-Original-Size', String(originalSize));
  }

  return reply.send(data);
}

function containsPathTraversal(segment: string): boolean {
  return segment.includes('..') || segment.includes('/') || segment.includes('\\');
}
