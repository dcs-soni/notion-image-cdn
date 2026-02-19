// In-Memory LRU Cache — L2 Alternative

// Used when Redis is not configured. Provides a simple in-memory LRU cache
// with configurable max size. Gracefully handles memory pressure by evicting
// least-recently-used entries.
//
// NOTE: This is a single-process cache. It does NOT share state across
// multiple server instances. For multi-instance deployments, use Redis.

export interface CacheEntry {
  data: Buffer;
  contentType: string;
  cachedAt: number;
}

export interface EdgeCache {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  name(): string;
  healthCheck(): Promise<boolean>;
}

export class MemoryCache implements EdgeCache {
  private readonly cache = new Map<string, { entry: CacheEntry; expiresAt: number }>();
  private readonly maxEntries: number;
  private readonly maxTotalBytes: number;
  private currentBytes = 0;

  constructor(options?: { maxEntries?: number; maxTotalBytes?: number }) {
    this.maxEntries = options?.maxEntries ?? 1000;
    // Default 512MB max — prevent OOM in constrained environments
    this.maxTotalBytes = options?.maxTotalBytes ?? 512 * 1024 * 1024;
  }

  name(): string {
    return 'memory';
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.currentBytes -= entry.entry.data.length;
      this.cache.delete(key);
      return null;
    }

    // Move to end to mark as most recently used (Map preserves insertion order)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.entry;
  }

  async set(key: string, entry: CacheEntry, ttlSeconds: number): Promise<void> {
    const existing = this.cache.get(key);
    if (existing) {
      this.currentBytes -= existing.entry.data.length;
      this.cache.delete(key);
    }

    while (
      (this.cache.size >= this.maxEntries ||
        this.currentBytes + entry.data.length > this.maxTotalBytes) &&
      this.cache.size > 0
    ) {
      // Evict the least recently used (first entry in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const evicted = this.cache.get(firstKey);
        if (evicted) {
          this.currentBytes -= evicted.entry.data.length;
        }
        this.cache.delete(firstKey);
      }
    }

    // Skip caching if a single entry exceeds the total limit (prevent OOM)
    if (entry.data.length > this.maxTotalBytes) {
      return;
    }

    this.currentBytes += entry.data.length;
    this.cache.set(key, {
      entry,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= entry.entry.data.length;
      this.cache.delete(key);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        this.currentBytes -= entry.entry.data.length;
        this.cache.delete(key);
      }
    }
  }
}
