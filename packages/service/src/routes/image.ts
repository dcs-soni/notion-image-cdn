// Clean URL Route — GET /img/:workspaceId/:blockId/:filename
//
// Provides permanent, human-readable URLs for Notion images.
// These URLs never change — even when the underlying S3 signed URL expires.
//
// If the image is not cached, returns 404 IMAGE_NOT_CACHED guiding the
// caller to prime the cache via /api/v1/proxy first.

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { runImagePipeline } from '../lib/image-pipeline.js';
import type { ResolvedConfig } from '../config/index.js';

interface ImageParams {
  workspaceId: string;
  blockId: string;
  filename: string;
}

const NOTION_S3_HOST = 'https://prod-files-secure.s3.us-west-2.amazonaws.com';

export async function imageRoutes(fastify: FastifyInstance) {
  const config: ResolvedConfig = fastify.config;

  fastify.get<{ Params: ImageParams }>(
    '/img/:workspaceId/:blockId/:filename',
    async (request: FastifyRequest<{ Params: ImageParams }>, reply: FastifyReply) => {
      const { workspaceId, blockId, filename } = request.params;

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

      // Cache key is based on path components (stable — does not expire)
      const cacheBaseUrl = `${NOTION_S3_HOST}/${workspaceId}/${blockId}/${filename}`;

      return runImagePipeline(
        cacheBaseUrl,
        request,
        reply,
        config,
        fastify.storage,
        fastify.edgeCache,
        {
          upstreamUrl: cacheBaseUrl,
          upstreamErrorMode: 'cache-miss',
          meta: { workspaceId, blockId },
        },
      );
    },
  );
}

function containsPathTraversal(segment: string): boolean {
  return segment.includes('..') || segment.includes('/') || segment.includes('\\');
}
