// Shared HTTP Response Utilities

import type { FastifyReply } from 'fastify';
import type { CacheTier } from '../types/index.js';

export function sendImageResponse(
  reply: FastifyReply,
  data: Buffer,
  contentType: string,
  cacheTier: CacheTier,
  originalSize?: number,
  cacheTtlSeconds = 86400,
): void {
  reply
    .header('Content-Type', contentType)
    .header('Content-Length', data.length)
    // L1 browser cache: 1 hour + stale-while-revalidate
    .header(
      'Cache-Control',
      `public, max-age=3600, s-maxage=${cacheTtlSeconds}, stale-while-revalidate=3600`,
    )
    .header('X-Cache', cacheTier === 'ORIGIN' ? 'MISS' : 'HIT')
    .header('X-Cache-Tier', cacheTier)
    .header('X-Optimized-Size', String(data.length));

  if (originalSize !== undefined) {
    reply.header('X-Original-Size', String(originalSize));
  }

  reply.send(data);
}
