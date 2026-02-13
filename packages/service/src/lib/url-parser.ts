import type { ParsedNotionUrl } from '../types/index.js';

const NOTION_HOSTS = [
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  'file.notion.so',
  'img.notionusercontent.com',
];

export function parseNotionUrl(rawUrl: string): ParsedNotionUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  // prod-files-secure.s3.us-west-2.amazonaws.com/<workspaceId>/<blockId>/<filename>
  if (hostname === NOTION_HOSTS[0]) {
    return extractFromPathSegments(parsed, parsed.pathname);
  }

  // s3.us-west-2.amazonaws.com/prod-files-secure/<workspaceId>/<blockId>/<filename>
  if (hostname === NOTION_HOSTS[1]) {
    const pathWithoutPrefix = parsed.pathname.replace(/^\/prod-files-secure/, '');
    return extractFromPathSegments(parsed, pathWithoutPrefix);
  }

  // file.notion.so/f/f/<workspaceId>/<assetId>/<filename>
  if (hostname === NOTION_HOSTS[2]) {
    const pathWithoutPrefix = parsed.pathname.replace(/^\/f\/f/, '');
    return extractFromPathSegments(parsed, pathWithoutPrefix);
  }

  // img.notionusercontent.com/s3/prod-files-secure%2F<workspace>%2F<asset>%2F<file>/size/...
  // The S3 key is URL-encoded as a single path segment after /s3/
  if (hostname === NOTION_HOSTS[3]) {
    return extractFromNotionusercontent(parsed);
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
 * Parse img.notionusercontent.com URLs.
 * Format: /s3/prod-files-secure%2F<workspace>%2F<asset>%2F<file.ext>/size/w=NNN
 * The S3 key is URL-encoded as a single path segment.
 */
function extractFromNotionusercontent(parsedUrl: URL): ParsedNotionUrl | null {
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  // Expect: ['s3', '<encoded-s3-key>', 'size', 'w=NNN', ...]
  if (segments.length < 2 || segments[0] !== 's3') {
    return null;
  }

  // Decode the S3 key segment: prod-files-secure/<workspace>/<asset>/<file>
  const s3Key = decodeURIComponent(segments[1] ?? '');
  const keyParts = s3Key.split('/').filter(Boolean);

  // Remove 'prod-files-secure' prefix if present
  if (keyParts[0] === 'prod-files-secure') {
    keyParts.shift();
  }

  if (keyParts.length < 3) {
    return null;
  }

  const workspaceId = keyParts[0] ?? '';
  const blockId = keyParts[1] ?? '';
  const filename = keyParts[keyParts.length - 1] ?? '';

  if (!workspaceId || !blockId || !filename) {
    return null;
  }

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
