// Notion URL Parser

// Parses Notion's pre-signed S3 URLs to extract workspace ID, block ID,
// and filename. These components are used for:
//   1. Clean URL routing: /img/:workspaceId/:blockId/:filename
//   2. Cache key generation
//   3. Webhook-based invalidation (by page/workspace)
//
// Notion S3 URL format:
//   https://prod-files-secure.s3.us-west-2.amazonaws.com/<workspaceId>/<blockId>/<filename>?X-Amz-...
//   https://s3.us-west-2.amazonaws.com/prod-files-secure/<workspaceId>/<blockId>/<filename>?X-Amz-...

import type { ParsedNotionUrl } from '../types/index.js';

const NOTION_S3_HOSTS = [
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
];

export function parseNotionUrl(rawUrl: string): ParsedNotionUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  //prod-files-secure.s3.us-west-2.amazonaws.com/<workspaceId>/<blockId>/<filename>
  if (hostname === NOTION_S3_HOSTS[0]) {
    return extractFromPathSegments(parsed, parsed.pathname);
  }

  // s3.us-west-2.amazonaws.com/prod-files-secure/<workspaceId>/<blockId>/<filename>
  if (hostname === NOTION_S3_HOSTS[1]) {
    // Remove the leading "/prod-files-secure" prefix
    const pathWithoutPrefix = parsed.pathname.replace(/^\/prod-files-secure/, '');
    return extractFromPathSegments(parsed, pathWithoutPrefix);
  }

  return null;
}

function extractFromPathSegments(parsedUrl: URL, pathname: string): ParsedNotionUrl | null {
  const segments = pathname.split('/').filter(Boolean);

  // workspaceId, blockId, filename
  if (segments.length < 3) {
    return null;
  }

  const workspaceId = decodeURIComponent(segments[0] ?? '');
  const blockId = decodeURIComponent(segments[1] ?? '');
  // Filename might contain subdirectory paths, take the last segment
  const filename = decodeURIComponent(segments[segments.length - 1] ?? '');

  if (!workspaceId || !blockId || !filename) {
    return null;
  }

  // Base URL without query params (for cache key stability)
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

  return {
    workspaceId,
    blockId,
    filename,
    baseUrl,
    fullUrl: parsedUrl.href,
  };
}

/**
 * Reconstruct a Notion S3 URL from its parsed components.
 * This is used when the clean URL endpoint needs to fetch the original image.
 *
 * NOTE: We cannot reconstruct the original pre-signed URL (the signature expires).
 * Instead, we use the Notion API to get a fresh signed URL, or fetch directly
 * from the stored base URL. The returned URL will NOT have valid S3 signing params.
 */
export function reconstructNotionPath(
  workspaceId: string,
  blockId: string,
  filename: string,
): string {
  const encodedWorkspace = encodeURIComponent(workspaceId);
  const encodedBlock = encodeURIComponent(blockId);
  const encodedFilename = encodeURIComponent(filename);

  return `${encodedWorkspace}/${encodedBlock}/${encodedFilename}`;
}
