// =============================================================================
// Request ID Middleware
// =============================================================================
// Attaches a unique request ID to every incoming request for distributed
// tracing and audit logging. Uses crypto.randomUUID() for cryptographic
// uniqueness — no collision risk.
// =============================================================================

import { randomUUID } from 'node:crypto';
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

const requestIdPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Use client-provided header if present (for distributed tracing),
    // otherwise generate a new UUID
    const existingId = request.headers['x-request-id'];
    const requestId =
      typeof existingId === 'string' && existingId.length > 0 && existingId.length <= 128
        ? existingId
        : randomUUID();

    // Attach to request for access in route handlers and logging
    request.requestId = requestId;

    // Echo back in response for client-side correlation
    reply.header('X-Request-Id', requestId);
  });

  done();
};

export default fp(requestIdPlugin, {
  name: 'request-id',
  fastify: '5.x',
});
