// =============================================================================
// URL Rewriter — Core SDK Logic
// =============================================================================
// Transforms Notion's expiring S3 URLs into permanent CDN URLs.
// This is pure string manipulation — zero runtime dependencies, zero side effects.
//
// Input:  https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-...
// Output: https://notion-cdn.example.com/img/abc/def/photo.jpg?w=800&fmt=webp&q=85
// =============================================================================

import type { OptimizeUrlOptions } from './types';

/**
 * Known Notion S3 hostnames.
 * URLs from these hosts are rewritten to use the CDN.
 * All other URLs are returned unchanged.
 */
const NOTION_S3_HOSTS = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
]);

/**
 * Rewrite a Notion S3 image URL to a permanent CDN URL.
 *
 * @param originalUrl - The original Notion S3 URL (with expiring signature)
 * @param options - CDN URL configuration
 * @returns The rewritten CDN URL, or the original URL if it's not a Notion image
 *
 * @example
 * ```ts
 * const url = getOptimizedUrl(
 *   'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-...',
 *   { cdnBaseUrl: 'https://notion-cdn.example.com', width: 800, format: 'webp' }
 * );
 * // → 'https://notion-cdn.example.com/img/abc/def/photo.jpg?w=800&fmt=webp'
 * ```
 */
export function getOptimizedUrl(originalUrl: string, options: OptimizeUrlOptions): string {
  // Parse the URL safely
  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    // If URL is invalid, return as-is (don't break rendering)
    return originalUrl;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Only rewrite known Notion S3 URLs
  if (!NOTION_S3_HOSTS.has(hostname)) {
    return originalUrl;
  }

  // Extract path components
  const pathParts = extractPathComponents(hostname, parsed.pathname);
  if (!pathParts) return originalUrl;

  const { workspaceId, blockId, filename } = pathParts;

  // Build the CDN URL
  const cdnBase = options.cdnBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  const cdnPath = `/img/${encodeURIComponent(workspaceId)}/${encodeURIComponent(blockId)}/${encodeURIComponent(filename)}`;

  // Build query params for transforms
  const params = new URLSearchParams();
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.format) params.set('fmt', options.format);
  if (options.quality) params.set('q', String(options.quality));
  if (options.fit) params.set('fit', options.fit);

  const queryString = params.toString();
  return queryString ? `${cdnBase}${cdnPath}?${queryString}` : `${cdnBase}${cdnPath}`;
}

/**
 * Check if a URL is a Notion S3 image URL.
 */
export function isNotionImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return NOTION_S3_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface PathComponents {
  workspaceId: string;
  blockId: string;
  filename: string;
}

function extractPathComponents(hostname: string, pathname: string): PathComponents | null {
  let relevantPath = pathname;

  // Handle path-style S3 URLs: /prod-files-secure/<workspace>/<block>/<filename>
  if (hostname === 's3.us-west-2.amazonaws.com') {
    relevantPath = pathname.replace(/^\/prod-files-secure/, '');
  }

  const segments = relevantPath.split('/').filter(Boolean);
  if (segments.length < 3) return null;

  const workspaceId = segments[0];
  const blockId = segments[1];
  const filename = segments[segments.length - 1];

  if (!workspaceId || !blockId || !filename) return null;

  return {
    workspaceId: decodeURIComponent(workspaceId),
    blockId: decodeURIComponent(blockId),
    filename: decodeURIComponent(filename),
  };
}
