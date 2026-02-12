import { describe, it, expect } from 'bun:test';
import { getOptimizedUrl, isNotionImageUrl } from '../src/url-rewriter';

const CDN_BASE = 'https://notion-cdn.example.com';

describe('getOptimizedUrl', () => {
  describe('URL rewriting', () => {
    it('rewrites Notion S3 URL to CDN URL', () => {
      const result = getOptimizedUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-Signature=xxx',
        { cdnBaseUrl: CDN_BASE },
      );
      expect(result).toBe(`${CDN_BASE}/img/abc/def/photo.jpg`);
    });

    it('includes transform query params', () => {
      const result = getOptimizedUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-Expires=3600',
        { cdnBaseUrl: CDN_BASE, width: 800, format: 'webp', quality: 85 },
      );
      expect(result).toContain('w=800');
      expect(result).toContain('fmt=webp');
      expect(result).toContain('q=85');
    });

    it('strips S3 query params (signatures)', () => {
      const result = getOptimizedUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-Signature=abc&X-Amz-Expires=3600',
        { cdnBaseUrl: CDN_BASE },
      );
      expect(result).not.toContain('X-Amz-Signature');
      expect(result).not.toContain('X-Amz-Expires');
    });

    it('handles trailing slash on CDN base URL', () => {
      const result = getOptimizedUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg',
        { cdnBaseUrl: `${CDN_BASE}/` },
      );
      expect(result).toContain(`${CDN_BASE}/img/`);
      expect(result).not.toContain('//img/');
    });
  });

  describe('passthrough', () => {
    it('returns non-Notion URLs unchanged', () => {
      const original = 'https://example.com/image.png';
      const result = getOptimizedUrl(original, { cdnBaseUrl: CDN_BASE });
      expect(result).toBe(original);
    });

    it('returns malformed URLs unchanged', () => {
      const original = 'not-a-url';
      const result = getOptimizedUrl(original, { cdnBaseUrl: CDN_BASE });
      expect(result).toBe(original);
    });

    it('returns relative URLs unchanged', () => {
      const original = '/images/photo.jpg';
      const result = getOptimizedUrl(original, { cdnBaseUrl: CDN_BASE });
      expect(result).toBe(original);
    });
  });
});

describe('isNotionImageUrl', () => {
  it('returns true for Notion S3 URLs', () => {
    expect(
      isNotionImageUrl('https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/image.png'),
    ).toBe(true);
  });

  it('returns false for non-Notion URLs', () => {
    expect(isNotionImageUrl('https://example.com/image.png')).toBe(false);
  });

  it('returns false for malformed URLs', () => {
    expect(isNotionImageUrl('not-a-url')).toBe(false);
  });
});
