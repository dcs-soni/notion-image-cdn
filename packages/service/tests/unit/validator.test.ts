import { describe, it, expect } from 'bun:test';
import { validateImageUrl } from '../../src/lib/validator.js';

const ALLOWED_DOMAINS = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'images.unsplash.com',
]);

describe('validateImageUrl', () => {
  // ===== Valid URLs =====
  describe('valid URLs', () => {
    it('accepts Notion S3 URL (virtual-hosted style)', () => {
      const result = validateImageUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/image.png?X-Amz-Expires=3600',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(true);
    });

    it('accepts Notion S3 URL (path style)', () => {
      const result = validateImageUrl(
        'https://s3.us-west-2.amazonaws.com/prod-files-secure/abc/def/image.png',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(true);
    });

    it('accepts Unsplash URL', () => {
      const result = validateImageUrl(
        'https://images.unsplash.com/photo-123?ixlib=rb-4.0.3',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(true);
    });
  });

  // ===== Security: Domain Allowlist (Layer 1) =====
  describe('Layer 1 — domain allowlist', () => {
    it('rejects non-allowed domains', () => {
      const result = validateImageUrl('https://evil.com/malware.jpg', ALLOWED_DOMAINS);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('DOMAIN_NOT_ALLOWED');
    });

    it('rejects subdomain spoofing', () => {
      const result = validateImageUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com.evil.com/abc/image.png',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('DOMAIN_NOT_ALLOWED');
    });
  });

  // ===== Security: HTTPS-Only (Layer 2) =====
  describe('Layer 2 — HTTPS only', () => {
    it('rejects HTTP URLs', () => {
      const result = validateImageUrl(
        'http://prod-files-secure.s3.us-west-2.amazonaws.com/abc/image.png',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('HTTPS_REQUIRED');
    });

    it('rejects FTP URLs', () => {
      const result = validateImageUrl('ftp://example.com/image.png', ALLOWED_DOMAINS);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('HTTPS_REQUIRED');
    });
  });

  // ===== Security: SSRF Prevention =====
  describe('SSRF prevention', () => {
    it('rejects localhost', () => {
      const allowed = new Set(['localhost']);
      const result = validateImageUrl('https://localhost/secret', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects 127.0.0.1', () => {
      const allowed = new Set(['127.0.0.1']);
      const result = validateImageUrl('https://127.0.0.1/secret', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects full loopback range (127.0.0.2)', () => {
      const allowed = new Set(['127.0.0.2']);
      const result = validateImageUrl('https://127.0.0.2/secret', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects 0.0.0.0', () => {
      const allowed = new Set(['0.0.0.0']);
      const result = validateImageUrl('https://0.0.0.0/secret', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects private IP ranges (10.x.x.x)', () => {
      const allowed = new Set(['10.0.0.1']);
      const result = validateImageUrl('https://10.0.0.1/internal', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects carrier-grade NAT (100.64.x.x)', () => {
      const allowed = new Set(['100.64.0.1']);
      const result = validateImageUrl('https://100.64.0.1/internal', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects private IP ranges (172.16.x.x)', () => {
      const allowed = new Set(['172.16.0.1']);
      const result = validateImageUrl('https://172.16.0.1/internal', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects private IP ranges (192.168.x.x)', () => {
      const allowed = new Set(['192.168.1.1']);
      const result = validateImageUrl('https://192.168.1.1/internal', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects cloud metadata endpoint', () => {
      const allowed = new Set(['169.254.169.254']);
      const result = validateImageUrl('https://169.254.169.254/latest/meta-data/', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects .internal TLD', () => {
      const allowed = new Set(['my-service.internal']);
      const result = validateImageUrl('https://my-service.internal/secret', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects multicast range (224.x.x.x)', () => {
      const allowed = new Set(['224.0.0.1']);
      const result = validateImageUrl('https://224.0.0.1/mcast', allowed);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('PRIVATE_HOST');
    });

    it('rejects URLs with embedded credentials', () => {
      const result = validateImageUrl(
        'https://user:pass@prod-files-secure.s3.us-west-2.amazonaws.com/abc/image.png',
        ALLOWED_DOMAINS,
      );
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('CREDENTIALS_IN_URL');
    });
  });

  // ===== Edge Cases =====
  describe('edge cases', () => {
    it('rejects empty URL', () => {
      const result = validateImageUrl('', ALLOWED_DOMAINS);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_URL');
    });

    it('rejects malformed URL', () => {
      const result = validateImageUrl('not-a-url', ALLOWED_DOMAINS);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_URL');
    });

    it('rejects extremely long URL', () => {
      const longUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/' + 'a'.repeat(5000);
      const result = validateImageUrl(longUrl, ALLOWED_DOMAINS);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('URL_TOO_LONG');
    });
  });
});
