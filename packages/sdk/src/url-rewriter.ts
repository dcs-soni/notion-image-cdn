// URL Rewriter — Core SDK Logic

// Transforms Notion's expiring S3 URLs into permanent CDN URLs.
// This is pure string manipulation — zero runtime dependencies, zero side effects.
//
// Input:  https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/photo.jpg?X-Amz-...
// Output: https://notion-cdn.example.com/img/abc/def/photo.jpg?w=800&fmt=webp&q=85

import type { OptimizeUrlOptions } from './types';

const NOTION_S3_HOSTS = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'file.notion.so',
  'img.notionusercontent.com',
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
  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return originalUrl;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!NOTION_S3_HOSTS.has(hostname)) {
    return originalUrl;
  }

  const pathParts = extractPathComponents(hostname, parsed.pathname);
  if (!pathParts) return originalUrl;

  const { workspaceId, blockId, filename } = pathParts;

  const cdnBase = options.cdnBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  const cdnPath = `/img/${encodeURIComponent(workspaceId)}/${encodeURIComponent(blockId)}/${encodeURIComponent(filename)}`;

  const params = new URLSearchParams();
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.format) params.set('fmt', options.format);
  if (options.quality) params.set('q', String(options.quality));
  if (options.fit) params.set('fit', options.fit);

  const queryString = params.toString();
  return queryString ? `${cdnBase}${cdnPath}?${queryString}` : `${cdnBase}${cdnPath}`;
}

export function isNotionImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return NOTION_S3_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

interface PathComponents {
  workspaceId: string;
  blockId: string;
  filename: string;
}

function extractPathComponents(hostname: string, pathname: string): PathComponents | null {
  // img.notionusercontent.com: /s3/prod-files-secure%2F<ws>%2F<id>%2F<file>/size/...
  if (hostname === 'img.notionusercontent.com') {
    const topSegments = pathname.split('/').filter(Boolean);
    if (topSegments.length < 2 || topSegments[0] !== 's3') return null;

    const s3Key = decodeURIComponent(topSegments[1] ?? '');
    const keyParts = s3Key.split('/').filter(Boolean);
    if (keyParts[0] === 'prod-files-secure') keyParts.shift();
    if (keyParts.length < 3) return null;

    return {
      workspaceId: keyParts[0] ?? '',
      blockId: keyParts[1] ?? '',
      filename: keyParts[keyParts.length - 1] ?? '',
    };
  }

  let relevantPath = pathname;

  // Handle path-style S3 URLs: /prod-files-secure/<workspace>/<block>/<filename>
  if (hostname === 's3.us-west-2.amazonaws.com') {
    relevantPath = pathname.replace(/^\/prod-files-secure/, '');
  }

  // Handle file.notion.so URLs: /f/f/<workspace>/<asset>/<filename>
  if (hostname === 'file.notion.so') {
    relevantPath = pathname.replace(/^\/f\/f/, '');
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
