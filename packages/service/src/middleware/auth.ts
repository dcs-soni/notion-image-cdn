import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { ResolvedConfig } from '../config/index.js';

interface AuthPluginOptions {
  config: ResolvedConfig;
}

const authPlugin: FastifyPluginCallback<AuthPluginOptions> = (fastify, opts, done) => {
  const { config } = opts;

  if (!config.API_KEYS_ENABLED) {
    done();
    return;
  }

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      reply.status(401).send({
        error: {
          status: 401,
          code: 'MISSING_API_KEY',
          message:
            'API key is required. Pass via Authorization: Bearer <key> header or ?api_key=<key> query parameter.',
          requestId: request.requestId,
        },
      });
      return;
    }

    if (apiKey.length > 256) {
      reply.status(401).send({
        error: {
          status: 401,
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format.',
          requestId: request.requestId,
        },
      });
      return;
    }

    // TODO:  validate against database with bcrypt hash comparison.
    // For now, we skip actual key validation since the dashboard isn't built yet.
    // This middleware only enforces that a key IS provided when API_KEYS_ENABLED=true.
    request.log.info({ hasApiKey: true }, 'API key provided');
  });

  done();
};

/**
 * Extract API key from request (header takes priority over query param).
 * This prevents the key from appearing in server access logs since headers
 * are typically not logged, while query params often are.
 */
function extractApiKey(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim();
    if (key.length > 0) return key;
  }

  const query = request.query as Record<string, unknown>;
  const queryKey = query['api_key'];
  if (typeof queryKey === 'string' && queryKey.length > 0) {
    return queryKey;
  }

  return null;
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
  dependencies: ['request-id'],
});
