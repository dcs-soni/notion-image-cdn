import { describe, it, expect } from 'bun:test';
import { generateCacheKey, generateCachePrefix } from '../../src/lib/cache-key.js';

describe('generateCacheKey', () => {
  it('generates deterministic keys for same URL', () => {
    const key1 = generateCacheKey('https://example.com/image.png');
    const key2 = generateCacheKey('https://example.com/image.png');
    expect(key1).toBe(key2);
  });

  it('generates different keys for different URLs', () => {
    const key1 = generateCacheKey('https://example.com/image1.png');
    const key2 = generateCacheKey('https://example.com/image2.png');
    expect(key1).not.toBe(key2);
  });

  it('appends "original" suffix when no transforms', () => {
    const key = generateCacheKey('https://example.com/image.png');
    expect(key).toMatch(/\/original$/);
  });

  it('includes transform options in key', () => {
    const key = generateCacheKey('https://example.com/image.png', {
      width: 800,
      format: 'webp',
      quality: 85,
    });
    expect(key).toContain('w800');
    expect(key).toContain('fwebp');
    expect(key).toContain('q85');
  });

  it('generates different keys for same URL with different transforms', () => {
    const key1 = generateCacheKey('https://example.com/image.png', { width: 400 });
    const key2 = generateCacheKey('https://example.com/image.png', { width: 800 });
    expect(key1).not.toBe(key2);
  });

  it('treats "original" format same as no format', () => {
    const key1 = generateCacheKey('https://example.com/image.png');
    const key2 = generateCacheKey('https://example.com/image.png', { format: 'original' });
    expect(key1).toBe(key2);
  });
});

describe('generateCachePrefix', () => {
  it('generates consistent prefix for a URL', () => {
    const prefix1 = generateCachePrefix('https://example.com/image.png');
    const prefix2 = generateCachePrefix('https://example.com/image.png');
    expect(prefix1).toBe(prefix2);
  });

  it('prefix ends with slash', () => {
    const prefix = generateCachePrefix('https://example.com/image.png');
    expect(prefix).toMatch(/\/$/);
  });

  it('cache keys for same URL start with the same prefix', () => {
    const url = 'https://example.com/image.png';
    const prefix = generateCachePrefix(url);
    const key = generateCacheKey(url, { width: 800 });
    expect(key.startsWith(prefix)).toBe(true);
  });
});
