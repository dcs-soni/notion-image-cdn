import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ResolvedConfig } from '../config/index.js';

let dailyProxyCount = 0;
let nextResetTime = getMidnightUTC();
let warned80 = false;
let warned90 = false;

function getMidnightUTC(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

/**
 * Creates a preHandler hook that enforces a daily quota for expensive operations.
 * Maintains an in-memory counter that resets at midnight UTC.
 */
export function buildQuotaPreHandler(config: ResolvedConfig) {
  return async function quotaCheck(request: FastifyRequest, reply: FastifyReply) {
    const now = Date.now();
    
    // Reset counter if midnight UTC has passed
    if (now >= nextResetTime) {
      dailyProxyCount = 0;
      nextResetTime = getMidnightUTC();
      warned80 = false;
      warned90 = false;
    }

    if (dailyProxyCount >= config.DAILY_PROXY_QUOTA) {
      const waitSeconds = Math.ceil((nextResetTime - now) / 1000);
      reply.header('Retry-After', String(waitSeconds));
      
      // We must return reply object or skip sending further (Fastify docs: preHandler returning a value or sending a response stops the execution)
      return reply.status(503).send({
        error: {
          status: 503,
          code: 'DAILY_QUOTA_EXCEEDED',
          message: `Daily proxy quota of ${config.DAILY_PROXY_QUOTA} requests exceeded. Try again tomorrow (UTC).`,
          requestId: request.requestId,
        },
      });
    }

    dailyProxyCount++;

    const ratio = dailyProxyCount / config.DAILY_PROXY_QUOTA;
    if (ratio >= 0.9 && !warned90) {
      request.log.warn(
        { count: dailyProxyCount, limit: config.DAILY_PROXY_QUOTA },
        'CRITICAL: Daily proxy quota has reached 90%'
      );
      warned90 = true;
    } else if (ratio >= 0.8 && !warned80) {
      request.log.warn(
        { count: dailyProxyCount, limit: config.DAILY_PROXY_QUOTA },
        'WARNING: Daily proxy quota has reached 80%'
      );
      warned80 = true;
    }
  };
}

// For testing purposes
export function _resetQuotaState() {
  dailyProxyCount = 0;
  warned80 = false;
  warned90 = false;
  nextResetTime = getMidnightUTC();
}

export function _setQuotaState(count: number, resetTime: number) {
  dailyProxyCount = count;
  nextResetTime = resetTime;
}
