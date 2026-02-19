// Shared Image Pipeline
//
// Encapsulates the canonical fetch → validate → optimize → cache → respond
// flow used by both /api/v1/proxy and /img/:workspaceId/:blockId/:filename.

import type { FastifyRequest, FastifyReply } from 'fastify';
import { fetchUpstreamImage, isFetchError } from './fetcher.js';
import { generateCacheKey } from './cache-key.js';
import { optimizeImage, negotiateFormat, parseTransformOptions } from './optimizer.js';
import { sendImageResponse } from './response.js';
import type { ResolvedConfig } from '../config/index.js';
import type { StorageBackend } from '../storage/interface.js';
import type { EdgeCache } from '../cache/memory.js';
import type { ImageMetadata, CacheTier, TransformOptions } from '../types/index.js';

export interface PipelineOptions {
  transform?: TransformOptions;
  /** Override upstream URL used for fetching (defaults to cacheBaseUrl) */
  upstreamUrl?: string;
  meta?: Pick<ImageMetadata, 'workspaceId' | 'blockId'>;

  //relay - forward the upstream status code directly (proxy route)
  // cache-miss - return 404 IMAGE_NOT_CACHED (clean URL route)
  upstreamErrorMode?: 'relay' | 'cache-miss';
}

export async function runImagePipeline(
  cacheBaseUrl: string,
  request: FastifyRequest,
  reply: FastifyReply,
  config: ResolvedConfig,
  storage: StorageBackend,
  edgeCache: EdgeCache | null,
  options: PipelineOptions = {},
): Promise<void> {
  const cacheTtl = config.CACHE_TTL_SECONDS;

  const query = request.query as Record<string, unknown>;
  const requestedTransform = options.transform ?? parseTransformOptions(query);

  const negotiatedFormat = negotiateFormat(request.headers.accept, requestedTransform.format);
  if (negotiatedFormat !== 'original') {
    requestedTransform.format = negotiatedFormat;
  }

  const cacheKey = generateCacheKey(cacheBaseUrl, requestedTransform);
  let cacheTier: CacheTier = 'ORIGIN';

  // L2 Edge cache check
  if (edgeCache) {
    const l2Hit = await edgeCache.get(cacheKey);
    if (l2Hit) {
      cacheTier = 'L2_EDGE';
      sendImageResponse(reply, l2Hit.data, l2Hit.contentType, cacheTier, undefined, cacheTtl);
      return;
    }
  }

  // L3 Persistent storage check
  const l3Hit = await storage.get(cacheKey);
  if (l3Hit) {
    cacheTier = 'L3_PERSISTENT';

    // Back-fill L2 from L3 (fire-and-forget - L2 is best-effort)
    if (edgeCache) {
      edgeCache
        .set(
          cacheKey,
          {
            data: l3Hit.data,
            contentType: l3Hit.metadata.contentType,
            cachedAt: Date.now(),
          },
          cacheTtl,
        )
        .catch(() => {});
    }

    sendImageResponse(
      reply,
      l3Hit.data,
      l3Hit.metadata.contentType,
      cacheTier,
      undefined,
      cacheTtl,
    );
    return;
  }

  // Cache MISS — fetch from upstream
  const upstreamUrl = options.upstreamUrl ?? cacheBaseUrl;
  request.log.info({ url: upstreamUrl }, 'Cache miss — fetching from upstream');

  const fetchResult = await fetchUpstreamImage(upstreamUrl, {
    timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    maxSizeBytes: config.MAX_IMAGE_SIZE_BYTES,
    allowedDomains: config.allowedDomainsSet,
  });

  if (isFetchError(fetchResult)) {
    request.log.error(
      { url: upstreamUrl, status: fetchResult.status, code: fetchResult.code },
      'Upstream fetch failed',
    );

    // Clean URL route: surface upstream 403/404/502 as a helpful cache-miss message
    if (
      options.upstreamErrorMode === 'cache-miss' &&
      (fetchResult.status === 403 || fetchResult.status === 404 || fetchResult.status === 502)
    ) {
      reply.status(404).send({
        error: {
          status: 404,
          code: 'IMAGE_NOT_CACHED',
          message:
            'This image is not yet cached. Use /api/v1/proxy?url=<encoded-notion-url> to cache it first.',
          requestId: request.requestId,
        },
      });
      return;
    }

    reply.status(fetchResult.status).send({
      error: {
        status: fetchResult.status,
        code: fetchResult.code,
        message: fetchResult.message,
        requestId: request.requestId,
      },
    });
    return;
  }

  // Optimize
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
    request.log.warn({ err }, 'Image optimization failed, serving original');
  }

  // Store in L3 (fire-and-forget — do not block the response)
  const metadata: ImageMetadata = {
    originalUrl: upstreamUrl,
    contentType: outputContentType,
    originalSize: fetchResult.originalSize,
    cachedSize: outputData.length,
    width,
    height,
    workspaceId: options.meta?.workspaceId,
    blockId: options.meta?.blockId,
    cachedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    accessCount: 0,
  };

  storage.put(cacheKey, outputData, metadata).catch((err) => {
    request.log.error({ err, cacheKey }, 'Failed to store in persistent cache (L3)');
  });

  // Store in L2 (fire-and-forget)
  if (edgeCache) {
    edgeCache
      .set(
        cacheKey,
        {
          data: outputData,
          contentType: outputContentType,
          cachedAt: Date.now(),
        },
        cacheTtl,
      )
      .catch(() => {});
  }

  sendImageResponse(
    reply,
    outputData,
    outputContentType,
    'ORIGIN',
    fetchResult.originalSize,
    cacheTtl,
  );
}
