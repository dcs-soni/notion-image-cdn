// Redis Edge Cache — L2 Cache Layer

// Redis-backed edge cache for production deployments. Provides shared cache
// across multiple server instances with configurable TTL.
//
// Gracefully degrades: if Redis is unavailable, methods return null/void
// instead of throwing (the system falls through to L3 persistent storage).

import Redis from 'ioredis';
import type { EdgeCache, CacheEntry } from './memory.js';

export class RedisCache implements EdgeCache {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private connected = false;

  constructor(redisUrl: string, keyPrefix = 'nicdn:') {
    this.keyPrefix = keyPrefix;
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 1000, 30000),
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('error', () => {
      this.connected = false;
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  name(): string {
    return 'redis';
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.client.connect();
      }
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    try {
      const redisKey = this.resolveKey(key);
      const raw = await this.client.getBuffer(redisKey);

      if (!raw) return null;

      // Binary format: <contentType-length(4 bytes)><contentType><image data>
      return deserializeEntry(raw);
    } catch {
      // Graceful degradation — Redis failure falls through to L3 persistent storage
      return null;
    }
  }

  async set(key: string, entry: CacheEntry, ttlSeconds: number): Promise<void> {
    try {
      const redisKey = this.resolveKey(key);
      const serialized = serializeEntry(entry);

      await this.client.setex(redisKey, ttlSeconds, serialized);
    } catch {
      // Graceful degradation — silently skip caching
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.resolveKey(key));
    } catch {}
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}${prefix}*`;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Graceful degradation
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  private resolveKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}

/**
 * Serialize a CacheEntry into a binary format for Redis storage.
 * Format: [contentType-length: 4 bytes][contentType: N bytes][image data: rest]
 */
function serializeEntry(entry: CacheEntry): Buffer {
  const contentTypeBytes = Buffer.from(entry.contentType, 'utf-8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(contentTypeBytes.length, 0);

  return Buffer.concat([lengthBuffer, contentTypeBytes, entry.data]);
}

function deserializeEntry(raw: Buffer): CacheEntry | null {
  if (raw.length < 4) return null;

  const contentTypeLength = raw.readUInt32BE(0);
  if (raw.length < 4 + contentTypeLength) return null;

  const contentType = raw.subarray(4, 4 + contentTypeLength).toString('utf-8');
  const data = raw.subarray(4 + contentTypeLength);

  return {
    data: Buffer.from(data),
    contentType,
    cachedAt: Date.now(),
  };
}
