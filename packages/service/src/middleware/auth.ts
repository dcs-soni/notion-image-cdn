//timing-safe comparison to prevent timing-based side-channel attacks

import { timingSafeEqual, createHash } from 'node:crypto';
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

  if (config.apiKeysSet.size === 0) {
    console.error(
      '[ERROR] API_KEYS_ENABLED=true but no API keys are configured. ' +
        'Set API_KEYS=<key1>,<key2>,... in your environment.',
    );
    process.exit(1);
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

    if (!isValidKey(apiKey, config.apiKeysSet)) {
      request.log.warn({ requestId: request.requestId }, 'Invalid API key presented');
      reply.status(401).send({
        error: {
          status: 401,
          code: 'INVALID_API_KEY',
          message: 'The provided API key is not valid.',
          requestId: request.requestId,
        },
      });
      return;
    }

    request.log.info({ requestId: request.requestId }, 'API key validated');
  });

  done();
};

function isValidKey(presented: string, validKeys: Set<string>): boolean {
  // Normalise to a fixed-length hash so timingSafeEqual can compare equal-length buffers
  const presentedHash = createHash('sha256').update(presented).digest();

  let isValid = false;
  for (const key of validKeys) {
    const keyHash = createHash('sha256').update(key).digest();
    // Run the comparison always (no short-circuit) to keep timing constant
    if (timingSafeEqual(presentedHash, keyHash)) {
      isValid = true;
    }
  }
  return isValid;
}

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
