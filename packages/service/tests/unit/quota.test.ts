import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  buildQuotaPreHandler,
  _resetQuotaState,
  _setQuotaState,
} from '../../src/middleware/quota.js';
import type { ResolvedConfig } from '../../src/config/index.js';

describe('Quota Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let logWarn: ReturnType<typeof mock>;
  let replyStatus: ReturnType<typeof mock>;
  let replySend: ReturnType<typeof mock>;
  let replyHeader: ReturnType<typeof mock>;

  const config = {
    DAILY_PROXY_QUOTA: 10,
  } as ResolvedConfig;

  beforeEach(() => {
    _resetQuotaState();

    logWarn = mock();
    mockRequest = {
      requestId: 'test-req-123',
      log: {
        warn: logWarn,
      } as any,
    };

    replySend = mock();
    replyStatus = mock().mockReturnValue({ send: replySend });
    replyHeader = mock().mockReturnValue({ status: replyStatus });

    mockReply = {
      status: replyStatus as any,
      header: replyHeader as any,
    };
  });

  it('allows requests under the quota threshold', async () => {
    const handler = buildQuotaPreHandler(config);

    // Simulate 5 requests
    for (let i = 0; i < 5; i++) {
      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    }

    expect(replyStatus).not.toHaveBeenCalled();
    expect(logWarn).not.toHaveBeenCalled();
  });

  it('warns when quota reaches 80% and 90%', async () => {
    const handler = buildQuotaPreHandler(config);

    // 1-7 requests (no warnings)
    for (let i = 0; i < 7; i++) {
      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    }
    expect(logWarn).not.toHaveBeenCalled();

    // 8th request (80% warning)
    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn.mock.calls[0]?.[1]).toContain('80%');

    // 9th request (90% warning)
    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn.mock.calls[1]?.[1]).toContain('90%');
  });

  it('returns 503 when quota is exceeded', async () => {
    const handler = buildQuotaPreHandler(config);

    // Fill up quota (10 requests)
    for (let i = 0; i < 10; i++) {
      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    }

    // 11th request (Blocked)
    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(replyHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(replyStatus).toHaveBeenCalledWith(503);

    const sendArg = replySend.mock.calls[0]?.[0];
    expect(sendArg?.error?.code).toBe('DAILY_QUOTA_EXCEEDED');
    expect(sendArg?.error?.status).toBe(503);
  });

  it('resets quota when UTC midnight passes', async () => {
    const handler = buildQuotaPreHandler(config);

    // Fill quota completely
    for (let i = 0; i < 10; i++) {
      await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);
    }

    // Time travel backwards so `nextResetTime` is in the past!
    _setQuotaState(10, Date.now() - 1000);

    // This request should reset the quota and succeed
    await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

    // Not blocked!
    expect(replyStatus).not.toHaveBeenCalled();
  });
});
