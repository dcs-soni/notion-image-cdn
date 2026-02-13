// =============================================================================
// Cache Key Generator
// =============================================================================
// Generates deterministic, collision-resistant cache keys from a source URL
// and optional transform options. Uses SHA-256 for content addressing.
//
// Key format: <sha256-of-base-url>/<variant-hash>
// Example:    a1b2c3d4e5f6.../w800_h600_fwebp_q85_fcover
//
// This decouples the cache key from the original URL path, so:
// - Different query params (S3 signatures) map to the same base key
// - Same URL with different transforms gets different variant keys

import { createHash } from 'node:crypto';
import type { TransformOptions } from '../types/index.js';

export function generateCacheKey(baseUrl: string, transform?: TransformOptions): string {
  const urlHash = hashString(baseUrl);
  const variantSuffix = generateVariantSuffix(transform);
  return variantSuffix ? `${urlHash}/${variantSuffix}` : `${urlHash}/original`;
}

export function generateCachePrefix(baseUrl: string): string {
  return `${hashString(baseUrl)}/`;
}

function generateVariantSuffix(options?: TransformOptions): string {
  if (!options) return '';

  const parts: string[] = [];

  if (options.width !== undefined) parts.push(`w${options.width}`);
  if (options.height !== undefined) parts.push(`h${options.height}`);
  if (options.format !== undefined && options.format !== 'original') {
    parts.push(`f${options.format}`);
  }
  if (options.quality !== undefined) parts.push(`q${options.quality}`);
  if (options.fit !== undefined) parts.push(`fit${options.fit}`);

  return parts.length > 0 ? parts.join('_') : '';
}

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
