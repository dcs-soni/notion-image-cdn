import { describe, it, expect } from 'bun:test';
import { parseNotionUrl, reconstructNotionPath } from '../../src/lib/url-parser.js';

describe('parseNotionUrl', () => {
  describe('virtual-hosted style URLs', () => {
    it('parses standard Notion S3 URL', () => {
      const result = parseNotionUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/workspace-abc/block-def/photo.jpg?X-Amz-Expires=3600',
      );
      expect(result).not.toBeNull();
      if (!result) throw new Error('Expected result to be non-null');
      expect(result.workspaceId).toBe('workspace-abc');
      expect(result.blockId).toBe('block-def');
      expect(result.filename).toBe('photo.jpg');
    });

    it('extracts base URL without query params', () => {
      const result = parseNotionUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/image.png?X-Amz-Signature=sig',
      );
      expect(result).not.toBeNull();
      if (!result) throw new Error('Expected result to be non-null');
      expect(result.baseUrl).toBe(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/image.png',
      );
    });
  });

  describe('path-style URLs', () => {
    it('parses S3 path-style URL', () => {
      const result = parseNotionUrl(
        'https://s3.us-west-2.amazonaws.com/prod-files-secure/workspace-abc/block-def/hero.png',
      );
      expect(result).not.toBeNull();
      if (!result) throw new Error('Expected result to be non-null');
      expect(result.workspaceId).toBe('workspace-abc');
      expect(result.blockId).toBe('block-def');
      expect(result.filename).toBe('hero.png');
    });
  });

  describe('edge cases', () => {
    it('returns null for non-Notion URLs', () => {
      const result = parseNotionUrl('https://example.com/image.png');
      expect(result).toBeNull();
    });

    it('returns null for malformed URLs', () => {
      const result = parseNotionUrl('not-a-url');
      expect(result).toBeNull();
    });

    it('returns null for URLs with too few path segments', () => {
      const result = parseNotionUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/only-one',
      );
      expect(result).toBeNull();
    });

    it('handles URL-encoded characters in path', () => {
      const result = parseNotionUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/work%20space/block%2Fid/image%20name.png',
      );
      expect(result).not.toBeNull();
      if (!result) throw new Error('Expected result to be non-null');
      expect(result.workspaceId).toBe('work space');
      expect(result.filename).toBe('image name.png');
    });
  });
});

describe('reconstructNotionPath', () => {
  it('reconstructs path from components', () => {
    const path = reconstructNotionPath('workspace-abc', 'block-def', 'photo.jpg');
    expect(path).toBe('workspace-abc/block-def/photo.jpg');
  });

  it('encodes special characters', () => {
    const path = reconstructNotionPath('work space', 'block/id', 'image name.png');
    expect(path).toBe('work%20space/block%2Fid/image%20name.png');
  });
});
